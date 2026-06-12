import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

// ──────────────────────────────────────────────
// GET /api/review-confirm/[customerId]
// ──────────────────────────────────────────────
// Ruta pública (sin auth) que el cliente visita
// desde el enlace secundario del email:
//   "Confirmar que ya escribí mi reseña"
//
// 1. Busca al cliente por su ID en la URL
// 2. Actualiza su estado a "completed"
// 3. Muestra página con selector de estrellas
// 4. Al pulsar una estrella hace POST a esta
//    misma URL guardando la valoración
// ──────────────────────────────────────────────

export async function GET(
  request: Request,
  { params }: { params: Promise<{ customerId: string }> },
) {
  const { customerId } = await params;
  const { searchParams } = new URL(request.url);
  const auto = searchParams.get('auto');
  const ratingParam = searchParams.get('rating');
  const redirectUrl = searchParams.get('redirect');

  // ─── Modo auto: guarda y redirige ─────────
  // Cuando el cliente pulsa el botón principal
  // del email, guardamos la valoración y lo
  // redirigimos directamente a Google Reviews
  if (auto === '1') {
    const rating = Math.min(Math.max(parseInt(ratingParam || '5'), 1), 5);
    try {
      await prisma.customer.update({
        where: { id: customerId },
        data: { status: 'completed', rating },
      });
    } catch { /* si falla redirigimos igual */ }

    if (redirectUrl) {
      return NextResponse.redirect(redirectUrl);
    }

    // Fallback si no hay redirect: obtener googleLink del negocio
    try {
      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
        include: { business: { select: { googleLink: true } } },
      });
      if (customer?.business?.googleLink) {
        return NextResponse.redirect(customer.business.googleLink);
      }
    } catch { /* silencioso */ }
  }

  let existingRating: number | null = null;
  let googleLink = '';

  try {
    const customer = await prisma.customer.update({
      where: { id: customerId },
      data: { status: 'completed' },
      include: { business: { select: { googleLink: true, name: true } } },
    });
    existingRating = customer.rating;
    googleLink = customer.business?.googleLink ?? '';
  } catch {
    // Si falla (ID inválido, etc.) mostramos igual
  }

  return new NextResponse(
    `<!DOCTYPE html>
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
  .check {
    width: 56px; height: 56px; border-radius: 50%; background: #0a0a0a;
    display: flex; align-items: center; justify-content: center;
    margin: 0 auto 24px;
  }
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
</style>
</head>
<body>
  <div class="card">
    <div class="check">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
    </div>
    <h1>¡Gracias por tu visita!</h1>
    <p>¿Qué tal tu experiencia? Pulsa una estrella para valorar y dejar tu reseña en Google.</p>

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
        hint.textContent = 'Guardando…';
        try {
          await fetch('/api/review-confirm/${customerId}', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rating: val }),
          });
        } catch { /* silencioso */ }
        if (googleLink) {
          window.location.href = googleLink;
        } else {
          hint.textContent = '¡Gracias por tu valoración!';
        }
      });
    });
  </script>
</body>
</html>`,
    { headers: { 'Content-Type': 'text/html' } },
  );
}

// ──────────────────────────────────────────────
// POST /api/review-confirm/[customerId]
// ──────────────────────────────────────────────
// Guarda la valoración en estrellas (1-5) que el
// cliente seleccionó en la página de confirmación.
// ──────────────────────────────────────────────

export async function POST(
  request: Request,
  { params }: { params: Promise<{ customerId: string }> },
) {
  const { customerId } = await params;
  const body = await request.json();
  const rating = body.rating;

  if (!rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'Valoración inválida' }, { status: 400 });
  }

  try {
    await prisma.customer.update({
      where: { id: customerId },
      data: { rating },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Error al guardar' }, { status: 500 });
  }
}
