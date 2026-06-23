import prisma from '@/lib/db';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ businessId: string }> },
) {
  const { businessId } = await params;

  // Verifica autenticación y que el negocio pertenezca al usuario
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id ?? '';
  if (!userId) {
    return new Response('No autenticado', { status: 401 });
  }

  const business = await prisma.business.findFirst({
    where: { id: businessId, userId },
    include: {
      _count: { select: { customers: true } },
    },
  });
  if (!business) {
    return new Response('Negocio no encontrado', { status: 404 });
  }

  // Obtiene clientes con rating bajo (reseñas negativas)
  const negativeReviews = await prisma.customer.findMany({
    where: {
      businessId,
      rating: { not: null, lte: 3 },
      feedback: { not: null },
    },
    orderBy: { rating: 'asc' },
    take: 50,
  });

  // Estadísticas
  const totalCustomers = business._count.customers;
  const totalWithRating = await prisma.customer.count({
    where: { businessId, rating: { not: null } },
  });
  const totalNegative = negativeReviews.length;
  const avgRating = totalWithRating > 0
    ? await prisma.customer.aggregate({
        where: { businessId, rating: { not: null } },
        _avg: { rating: true },
      }).then(r => r._avg.rating?.toFixed(1) ?? 'N/A')
    : 'N/A';

  const negativePercentage = totalWithRating > 0
    ? Math.round((totalNegative / totalWithRating) * 100)
    : 0;

  // Temas comunes en reseñas negativas
  const keywordCounts = new Map<string, number>();
  const keywords = ['espera', 'lento', 'caro', 'precio', 'calidad', 'servicio',
    'atención', 'amable', 'limpio', 'ubicación', 'horario', 'parking',
    'reserva', 'cita', 'devolución', 'problema', 'error', 'queja'];
  for (const review of negativeReviews) {
    const text = (review.feedback ?? '').toLowerCase();
    for (const kw of keywords) {
      if (text.includes(kw)) {
        keywordCounts.set(kw, (keywordCounts.get(kw) ?? 0) + 1);
      }
    }
  }
  const topKeywords = [...keywordCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  // Genera recomendaciones basadas en los temas detectados
  const recomendaciones = [
    ...(keywordCounts.has('espera') || keywordCounts.has('lento')
      ? ['Revisar tiempos de espera y optimizar procesos operativos para reducir demoras.']
      : []),
    ...(keywordCounts.has('caro') || keywordCounts.has('precio')
      ? ['Evaluar estrategia de precios y considerar promociones o paquetes para mejorar percepción de valor.']
      : []),
    ...(keywordCounts.has('calidad')
      ? ['Realizar auditoría de calidad del producto/servicio y establecer controles más estrictos.']
      : []),
    ...(keywordCounts.has('servicio') || keywordCounts.has('atención')
      ? ['Programar formación adicional para el equipo de atención al cliente.']
      : []),
    ...(keywordCounts.has('limpio')
      ? ['Revisar protocolos de limpieza y mantenimiento de las instalaciones.']
      : []),
    ...(keywordCounts.has('horario')
      ? ['Considerar ampliar horarios de atención o mejorar la comunicación de los horarios actuales.']
      : []),
    ...(keywordCounts.has('parking') || keywordCounts.has('ubicación')
      ? ['Mejorar señalización y proporcionar indicaciones claras de acceso y aparcamiento.']
      : []),
    ...(keywordCounts.has('reserva') || keywordCounts.has('cita')
      ? ['Digitalizar y simplificar el sistema de reservas para evitar confusiones.']
      : []),
  ];

  // Si no hay reseñas negativas, recomendación general
  if (recomendaciones.length === 0 && totalNegative > 0) {
    recomendaciones.push('Contactar individualmente a los clientes insatisfechos para conocer su experiencia y resolver sus quejas.');
  } else if (totalNegative === 0) {
    recomendaciones.push('Mantener el nivel de calidad actual. Seguir monitorizando reseñas para detectar cualquier cambio.');
  }

  const reportDate = new Date().toLocaleDateString('es-ES', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Plan de Acción - ${business.name}</title>
  <style>
    @page { margin: 2cm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      color: #1a1a1a;
      line-height: 1.6;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
    }
    h1 { font-size: 24px; margin-bottom: 4px; }
    h2 { font-size: 18px; margin-top: 32px; margin-bottom: 12px; color: #333; border-bottom: 2px solid #eee; padding-bottom: 6px; }
    h3 { font-size: 14px; margin-top: 20px; margin-bottom: 8px; color: #555; }
    p { margin-bottom: 12px; color: #444; font-size: 13px; }
    .header { margin-bottom: 32px; }
    .header p { color: #888; font-size: 12px; }
    .stats { display: flex; gap: 16px; margin-bottom: 24px; }
    .stat { flex: 1; background: #f5f5f5; border-radius: 8px; padding: 16px; text-align: center; }
    .stat-value { font-size: 28px; font-weight: bold; color: #1a1a1a; }
    .stat-label { font-size: 11px; color: #888; margin-top: 2px; text-transform: uppercase; letter-spacing: 0.5px; }
    .negative { color: #dc2626; }
    .keywords { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
    .keyword { background: #fef2f2; color: #dc2626; padding: 4px 12px; border-radius: 16px; font-size: 12px; font-weight: 500; }
    .recommendations { list-style: none; }
    .recommendations li {
      background: #f0fdf4; border-left: 3px solid #22c55e; padding: 12px 16px; margin-bottom: 8px;
      border-radius: 0 8px 8px 0; font-size: 13px; color: #333;
    }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
    th { text-align: left; padding: 8px 12px; background: #f5f5f5; color: #555; font-weight: 600; border-bottom: 2px solid #eee; }
    td { padding: 10px 12px; border-bottom: 1px solid #f0f0f0; color: #444; }
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #eee; font-size: 11px; color: #aaa; text-align: center; }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${business.name}</h1>
    <p>Plan de acción basado en reseñas de clientes · ${reportDate}</p>
  </div>

  <div class="stats">
    <div class="stat">
      <div class="stat-value">${totalCustomers}</div>
      <div class="stat-label">Clientes registrados</div>
    </div>
    <div class="stat">
      <div class="stat-value">${totalWithRating}</div>
      <div class="stat-label">Con valoración</div>
    </div>
    <div class="stat">
      <div class="stat-value ${negativePercentage > 30 ? 'negative' : ''}">${totalNegative}</div>
      <div class="stat-label">Reseñas negativas</div>
    </div>
    <div class="stat">
      <div class="stat-value">${avgRating}</div>
      <div class="stat-label">Valoración media</div>
    </div>
  </div>

  <h2>Análisis de temas recurrentes</h2>
  ${topKeywords.length > 0
    ? `<p>Temas más mencionados en reseñas negativas:</p>
       <div class="keywords">
         ${topKeywords.map(([kw, count]) => `<span class="keyword">${kw} (${count})</span>`).join('')}
       </div>`
    : '<p>No se detectaron temas recurrentes en las reseñas negativas.</p>'
  }

  <h2>Plan de acción recomendado</h2>
  ${recomendaciones.length > 0
    ? `<ol class="recommendations">
         ${recomendaciones.map(r => `<li>${r}</li>`).join('')}
       </ol>`
    : '<p>No hay reseñas negativas que requieran un plan de acción en este momento.</p>'
  }

  ${negativeReviews.length > 0 ? `
  <h2>Detalle de reseñas negativas</h2>
  <table>
    <thead>
      <tr>
        <th>Cliente</th>
        <th>Valoración</th>
        <th>Comentario</th>
      </tr>
    </thead>
    <tbody>
      ${negativeReviews.map(r => `
        <tr>
          <td>${r.name || 'Anónimo'}</td>
          <td>${'★'.repeat(r.rating ?? 0)}${'☆'.repeat(5 - (r.rating ?? 0))}</td>
          <td>${r.feedback ? r.feedback.substring(0, 120) + (r.feedback.length > 120 ? '...' : '') : '—'}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>` : ''}

  <div class="footer">
    <p>Revly — Generado automáticamente el ${reportDate}</p>
  </div>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}
