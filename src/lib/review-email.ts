import { escapeHtml } from '@/lib/customer-capabilities';

// Raw review capability is passed by an authorized server caller; never looked up from an ID here.
export function buildReviewEmail({ customerId, customerName, businessName, emailTemplate, baseUrl, reviewToken }: {
  customerId: string; customerName: string; businessName: string; googleLink: string;
  emailTemplate?: string | null; baseUrl: string; reviewToken: string;
}): { subject: string; html: string; reviewUrl: string } {
  const url = new URL(`/api/review-confirm/${encodeURIComponent(customerId)}`, baseUrl);
  url.hash = new URLSearchParams({ token: reviewToken }).toString();
  const reviewUrl = url.href;
  const stars = [1, 2, 3, 4, 5].map(rating => {
    const starUrl = new URL(reviewUrl);
    starUrl.searchParams.set('rating', String(rating));
    return `<a href="${escapeHtml(starUrl.href)}" style="font-size:36px;color:#f59e0b;text-decoration:none;">★</a>`;
  }).join(' ');
  const greeting = customerName ? `Hola, ${customerName}` : 'Gracias por tu visita';
  // Custom templates keep basic formatting but cannot insert scripts, attributes or unsafe links.
  let body = emailTemplate ? escapeHtml(emailTemplate).replace(/&lt;(\/?)(p|br|strong|b|em|i|h1|h2)&gt;/gi, '<$1$2>') : '<h1>{{nombre}}</h1><p>En <strong>{{negocio}}</strong> valoramos tu opinión.</p>';
  body = body.replace(/\{\{(nombre|negocio|link|confirmar)\}\}/g, (_match, key) => escapeHtml(({ nombre: greeting, negocio: businessName, link: reviewUrl, confirmar: reviewUrl })[key]));
  return {
    subject: `${customerName ? `${customerName}, ` : ''}cuéntanos tu experiencia en ${businessName}`,
    reviewUrl,
    html: `<!doctype html><html lang="es"><body><main>${body}<p>${stars}</p><p>Elige una estrella y confirma tu valoración en la página. El enlace caduca en 7 días desde su emisión.</p><footer>${escapeHtml(businessName)} · Revly</footer></main></body></html>`,
  };
}
