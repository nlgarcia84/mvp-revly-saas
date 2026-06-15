import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

const feedbackPage = (businessName: string, customerId: string, googleLink: string) => `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Gracias por tu opinión</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    margin: 0; padding: 24px; background: #f5f5f5;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    min-height: 100vh; display: flex; align-items: center; justify-content: center;
  }
  .card {
    max-width: 480px; width: 100%; text-align: center;
    background: #fff; border-radius: 16px; padding: 40px 32px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  }
  .check { width: 56px; height: 56px; border-radius: 50%; background: #0a0a0a; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; }
  h1 { font-size: 22px; color: #0a0a0a; margin-bottom: 8px; }
  p  { font-size: 15px; color: #737373; line-height: 1.5; margin-bottom: 24px; }
  textarea {
    width: 100%; padding: 12px; border: 1px solid #e5e5e5; border-radius: 8px;
    font-size: 14px; font-family: inherit; resize: vertical; min-height: 100px;
    outline: none; margin-bottom: 12px;
  }
  textarea:focus { border-color: #0a0a0a; }
  .btn {
    display: block; width: 100%; padding: 10px 24px; border-radius: 8px;
    font-size: 14px; font-weight: 500; cursor: pointer; border: none;
    background: #0a0a0a; color: #fff; transition: opacity .15s;
  }
  .btn:hover { opacity: .8; }
  .btn:disabled { opacity: .4; cursor: not-allowed; }
  .btn-secondary {
    display: block; width: 100%; padding: 10px 24px; border-radius: 8px;
    font-size: 14px; font-weight: 500; cursor: pointer; border: 1px solid #e5e5e5;
    background: transparent; color: #737373; transition: all .15s; margin-top: 8px;
  }
  .btn-secondary:hover { border-color: #0a0a0a; color: #0a0a0a; }
  .divider { margin: 16px 0; border: none; border-top: 1px solid #e5e5e5; }
</style>
</head>
<body>
  <div class="card">
    <div class="check"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>
    <h1>¡Gracias por tu valoración!</h1>
    <p>Nos ayuda a mejorar. ¿Quieres dejarnos un comentario privado?</p>

    <textarea id="message" placeholder="¿Cómo podemos mejorar? (opcional)"></textarea>
    <button class="btn" id="sendBtn" onclick="sendAndGo()">Enviar y dejar reseña en Google</button>
    <button class="btn-secondary" onclick="goToGoogle()">Omitir y dejar reseña en Google</button>
  </div>

  <script>
    const googleLink = ${googleLink ? `'${googleLink}'` : 'null'};
    const customerId = '${customerId}';

    async function sendAndGo() {
      const msg = document.getElementById('message').value;
      const btn = document.getElementById('sendBtn');
      btn.disabled = true; btn.textContent = 'Enviando…';
      try {
        await fetch('/api/review-confirm/' + customerId, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ feedback: msg }),
        });
      } catch { /* silencioso */ }
      goToGoogle();
    }

    function goToGoogle() {
      if (googleLink) {
        window.location.href = googleLink;
      } else {
        window.location.href = 'https://www.google.com';
      }
    }
  </script>
</body>
</html>`;



const starsPage = (customerId: string, existingRating: number | null, googleLink: string, businessName: string) => `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Gracias por tu reseña</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    margin: 0; padding: 24px; background: #f5f5f5;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    min-height: 100vh; display: flex; align-items: center; justify-content: center;
  }
  .card {
    max-width: 420px; width: 100%; text-align: center;
    background: #fff; border-radius: 16px; padding: 40px 32px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  }
  .check { width: 56px; height: 56px; border-radius: 50%; background: #0a0a0a; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; }
  h1 { font-size: 22px; color: #0a0a0a; margin-bottom: 8px; }
  p  { font-size: 15px; color: #737373; line-height: 1.5; margin-bottom: 24px; }
  .stars { display: flex; gap: 6px; justify-content: center; }
  .star {
    font-size: 44px; cursor: pointer; color: #d4d4d4; user-select: none;
    transition: transform .15s, color .15s;
  }
  .star:hover { transform: scale(1.15); }
  .star.selected { color: #f59e0b; }
  .hint { font-size: 13px; color: #a3a3a3; margin-top: 16px; }
  .btn { display: inline-block; padding: 10px 24px; border-radius: 8px; font-size: 14px; font-weight: 500; text-decoration: none; background: #0a0a0a; color: #fff; transition: opacity .15s; margin-top: 16px; }
  .btn:hover { opacity: .8; }
  .hidden { display: none; }
</style>
</head>
<body>
  <div class="card">
    <div class="check"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>
    <h1>¡Gracias por tu visita!</h1>
    <p>¿Qué tal tu experiencia en <strong>${businessName}</strong>? Pulsa una estrella para valorar.</p>

    <div class="stars" id="stars">
      <span class="star" data-value="1">★</span>
      <span class="star" data-value="2">★</span>
      <span class="star" data-value="3">★</span>
      <span class="star" data-value="4">★</span>
      <span class="star" data-value="5">★</span>
    </div>
    <p class="hint" id="hint">Pulsa una estrella para continuar</p>
  </div>

  <script>
    const stars = document.querySelectorAll('.star');
    const hint = document.getElementById('hint');
    let saved = ${existingRating !== null ? 'true' : 'false'};
    const googleLink = ${googleLink ? `'${googleLink}'` : 'null'};

    if (saved) {
      hint.textContent = 'Ya valoraste este negocio. ¡Gracias!';
    }

    stars.forEach(s => {
      s.addEventListener('click', async () => {
        if (saved) return;
        const val = parseInt(s.dataset.value);
        saved = true;
        stars.forEach(st => st.classList.toggle('selected', parseInt(st.dataset.value) <= val));

        try {
          await fetch('/api/review-confirm/${customerId}', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rating: val }),
          });
        } catch { /* silencioso */ }

        if (googleLink) {
          hint.textContent = 'Redirigiendo a Google…';
          window.location.href = googleLink;
        } else {
          hint.textContent = '¡Gracias por tu valoración!';
          window.location.href = 'https://www.google.com';
        }
      });
    });
  </script>
</body>
</html>`;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ customerId: string }> },
) {
  const { customerId } = await params;
  const { searchParams } = new URL(request.url);
  const auto = searchParams.get('auto');
  const ratingParam = searchParams.get('rating');
  const redirectUrl = searchParams.get('redirect');

  if (auto === '1') {
    const rating = Math.min(Math.max(parseInt(ratingParam || '5'), 1), 5);
    try {
      await prisma.customer.update({
        where: { id: customerId },
        data: { status: 'completed', rating },
      });
    } catch { /* silencioso */ }

    let businessName = 'tu negocio';
    let googleLink = redirectUrl ?? '';
    try {
      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
        include: { business: { select: { name: true, googleLink: true } } },
      });
      businessName = customer?.business?.name ?? businessName;
      if (!googleLink) googleLink = customer?.business?.googleLink ?? '';
    } catch { /* silencioso */ }

    return new NextResponse(
      feedbackPage(businessName, customerId, googleLink),
      { headers: { 'Content-Type': 'text/html' } },
    );
  }

  let existingRating: number | null = null;
  let googleLink = '';
  let businessName = '';

  try {
    const customer = await prisma.customer.update({
      where: { id: customerId },
      data: { status: 'completed' },
      include: { business: { select: { googleLink: true, name: true } } },
    });
    existingRating = customer.rating;
    googleLink = customer.business?.googleLink ?? '';
    businessName = customer.business?.name ?? '';
  } catch { /* silencioso */ }

  return new NextResponse(
    starsPage(customerId, existingRating, googleLink, businessName),
    { headers: { 'Content-Type': 'text/html' } },
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ customerId: string }> },
) {
  const { customerId } = await params;
  const body = await request.json();
  const rating = body.rating;
  const feedback = body.feedback;

  if (rating !== undefined && (rating < 1 || rating > 5)) {
    return NextResponse.json({ error: 'Valoración inválida' }, { status: 400 });
  }

  try {
    await prisma.customer.update({
      where: { id: customerId },
      data: {
        ...(rating !== undefined ? { rating } : {}),
        ...(feedback !== undefined ? { feedback } : {}),
      },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Error al guardar' }, { status: 500 });
  }
}
