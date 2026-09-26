// Construye el email de invitación a reseñar (asunto + HTML + enlace).
// Lo usan el envío manual desde el dashboard y el envío programado del registro.

export function buildReviewEmail({
  customerId,
  customerName,
  businessName,
  googleLink,
  emailTemplate,
  baseUrl,
}: {
  customerId: string;
  customerName: string;
  businessName: string;
  googleLink: string;
  emailTemplate?: string | null;
  baseUrl: string;
}): { subject: string; html: string; reviewUrl: string } {
  // Enlace que guarda 5 estrellas, marca como completado y va a Google Reviews.
  const reviewUrl = `${baseUrl}/api/review-confirm/${customerId}?auto=1&rating=5&redirect=${encodeURIComponent(googleLink)}`;

  // Cinco estrellas clicables, cada una con su valoración.
  const starsHtml = [1, 2, 3, 4, 5]
    .map(
      (stars) =>
        `<a href="${baseUrl}/api/review-confirm/${customerId}?auto=1&rating=${stars}&redirect=${encodeURIComponent(googleLink)}" target="_blank" style="display:inline-block;font-size:40px;text-decoration:none;color:#f59e0b;padding:0 4px;transition:opacity .15s;" onmouseover="this.style.opacity='.7'" onmouseout="this.style.opacity='1'">★</a>`,
    )
    .join('');

  let bodyHtml =
    emailTemplate ||
    `
    <h1 style="margin:0 0 8px;font-size:24px;color:#0a0a0a;">{{nombre}}</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#737373;line-height:1.5;">
      En <strong>{{negocio}}</strong> valoramos mucho tu opini&oacute;n.
      &iquest;Podr&iacute;as dedicar un minuto a dejar una rese&ntilde;a en Google?
    </p>
  `;

  // Reemplazamos las variables del template.
  bodyHtml = bodyHtml
    .replace(
      /\{\{nombre\}\}/g,
      customerName ? `Hola, ${customerName}` : 'Gracias por tu visita',
    )
    .replace(/\{\{negocio\}\}/g, businessName)
    .replace(/\{\{link\}\}/g, reviewUrl)
    .replace(/\{\{confirmar\}\}/g, reviewUrl);

  const html = `
<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background-color:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:32px 16px;">
      <tr>
        <td align="center">
          <table width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="padding:40px 32px;text-align:center;">
                ${bodyHtml}
                <div style="margin-top:16px;">${starsHtml}</div>
                <p style="margin:12px 0 0;font-size:13px;color:#a3a3a3;">Pulsa una estrella para valorar y dejar tu rese&ntilde;a</p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px;background-color:#fafafa;text-align:center;">
                <p style="margin:0;font-size:12px;color:#a3a3a3;">
                  ${businessName} &middot; Enviado a trav&eacute;s de Revly
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const subject = `${customerName ? `${customerName}, ` : ''}cuéntanos tu experiencia en ${businessName}`;

  return { subject, html, reviewUrl };
}
