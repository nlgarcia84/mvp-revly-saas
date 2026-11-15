import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { authorizeReview, safeGoogleReviewUrl, takePublicRateLimit } from '@/lib/customer-capabilities';

const headers = { 'Cache-Control': 'no-store, private', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff' };
const denied = () => NextResponse.json({ error: 'Enlace no válido o caducado. Solicita una nueva invitación.' }, { status: 403, headers });

// Deliberately generic: GET performs NO database access, authorization exchange or mutation.
// Tokens travel in a fragment (not sent in the HTTP URL), then in an HTTPS POST body.
export async function GET(_request: Request, { params }: { params: Promise<{ customerId: string }> }) {
  const { customerId } = await params;
  const nonce = randomBytes(18).toString('base64');
  const endpoint = JSON.stringify(`/api/review-confirm/${encodeURIComponent(customerId)}`).replace(/</g, '\\u003c');
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Tu valoración · Revly</title></head>
<body><main><h1>Tu experiencia</h1><p id="message" role="status">Validando invitación…</p>
<form id="review" hidden><label>Valoración <select id="rating" required><option value="">Elige de 1 a 5</option>${[1,2,3,4,5].map(n => `<option value="${n}">${n} estrella${n === 1 ? '' : 's'}</option>`).join('')}</select></label>
<label>Comentario privado (opcional)<textarea id="feedback" maxlength="2000"></textarea></label><button id="submit">Guardar y continuar</button></form>
<a id="google" hidden rel="noreferrer noopener">Dejar reseña en Google</a>
<p id="recovery" hidden>Por seguridad los enlaces antiguos o caducados necesitan una invitación nueva. Solicítala al negocio o vuelve a su QR para verificar tu email.</p></main>
<script nonce="${nonce}">
const endpoint = ${endpoint};
const token = new URLSearchParams(location.hash.slice(1)).get('token') || '';
const preselected = new URLSearchParams(location.search).get('rating');
history.replaceState(null, '', location.pathname);
const message = document.getElementById('message'), form = document.getElementById('review'), google = document.getElementById('google');
let googleLink = null;
async function post(payload) {
  const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, ...payload }) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'No se pudo guardar. Inténtalo de nuevo.');
  return data;
}
(async () => {
  try {
    if (!token) throw new Error('Enlace no válido o caducado.');
    const data = await post({ action: 'view' });
    message.textContent = '¿Qué tal tu experiencia en ' + data.businessName + '?';
    googleLink = data.googleLink;
    if (googleLink) { google.href = googleLink; google.hidden = false; }
    if (/^[1-5]$/.test(preselected || '')) document.getElementById('rating').value = preselected;
    form.hidden = false;
  } catch (error) { message.textContent = error.message; document.getElementById('recovery').hidden = false; }
})();
form.addEventListener('submit', async event => {
  event.preventDefault();
  const button = document.getElementById('submit'); button.disabled = true;
  try {
    await post({ action: 'submit', rating: Number(document.getElementById('rating').value), feedback: document.getElementById('feedback').value });
    form.hidden = true; message.textContent = 'Gracias por tu opinión. Puedes continuar a Google Reviews.';
    if (googleLink) location.assign(googleLink);
  } catch (error) { message.textContent = error.message; button.disabled = false; }
});
</script></body></html>`;
  return new NextResponse(html, { headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8',
    'Content-Security-Policy': `default-src 'none'; script-src 'nonce-${nonce}'; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'` } });
}

export async function POST(request: Request, { params }: { params: Promise<{ customerId: string }> }) {
  const { customerId } = await params;
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return denied();
  let payload: any;
  try {
    if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') throw new Error();
    if (Number(request.headers.get('content-length')) > 12_000 || !request.body) throw new Error();
    const reader = request.body.getReader();
    const parts: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 12_000) { await reader.cancel(); throw new Error(); }
      parts.push(value);
    }
    const raw = Buffer.concat(parts).toString('utf8');
    payload = JSON.parse(raw);
    if (!payload || typeof payload !== 'object' || Array.isArray(payload) || Object.keys(payload).some(k => !['action', 'token', 'rating', 'feedback'].includes(k))) throw new Error();
  } catch { return NextResponse.json({ error: 'Solicitud no válida' }, { status: 400, headers }); }
  const grant = await authorizeReview(customerId, payload.token);
  if (!grant) return denied();
  if (!['view', 'submit'].includes(payload.action) ||
      (payload.action === 'view' && ('rating' in payload || 'feedback' in payload)) ||
      (payload.action === 'submit' && (!Number.isInteger(payload.rating) || payload.rating < 1 || payload.rating > 5 ||
        (payload.feedback !== undefined && (typeof payload.feedback !== 'string' || payload.feedback.length > 2000))))) {
    return NextResponse.json({ error: 'Valoración o comentario no válidos' }, { status: 400, headers });
  }
  // Authorization failures never cause customer writes or rate-limit side effects.
  if (payload.action === 'view') {
    const customer = await prisma.customer.findFirst({ where: { id: customerId, businessId: grant.businessId }, select: { business: { select: { name: true, googleLink: true } } } });
    if (!customer) return denied();
    return NextResponse.json({ businessName: customer.business.name, googleLink: safeGoogleReviewUrl(customer.business.googleLink) }, { headers });
  }
  if (!await takePublicRateLimit(`review:${grant.tokenHash}`, 10)) return NextResponse.json({ error: 'Demasiados intentos. Inténtalo más tarde.' }, { status: 429, headers });
  // Recheck expiry in the writing statement, including the composite customer/business relation.
  const updated = await prisma.customer.updateMany({ where: { id: customerId, businessId: grant.businessId, email: grant.email,
    capabilities: { some: { tokenHash: grant.tokenHash, scope: 'review', expiresAt: { gt: new Date() } } } },
    data: { status: 'completed', rating: payload.rating, ...(payload.feedback !== undefined ? { feedback: payload.feedback } : {}) } });
  if (updated.count !== 1) return denied();
  return NextResponse.json({ ok: true }, { headers });
}
