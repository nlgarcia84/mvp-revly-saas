'use server';

import prisma from '@/lib/db';
import { createClient } from '@/lib/supabase/server';

// Devuelve el id del usuario autenticado o lanza si no hay sesión.
async function requireUserId(): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');
  return user.id;
}

// Envía un email de invitación a dejar reseña y marca al cliente como invitado.
export const sendInvitation = async (customerId: string) => {
  const userId = await requireUserId();

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, business: { userId } },
    include: { business: true },
  });
  if (!customer) throw new Error('Cliente no encontrado');

  const { name, email, business } = customer;
  const googleLink = business.googleLink;
  const businessName = business.name;
  const customerName = name ?? '';

  if (!googleLink) {
    throw new Error('El negocio no tiene enlace de Google Reviews configurado');
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  // Enlace que guarda 5 estrellas, marca como completado y va a Google Reviews.
  const reviewUrl = `${baseUrl}/api/review-confirm/${customer.id}?auto=1&rating=5&redirect=${encodeURIComponent(googleLink)}`;

  // Cinco estrellas clicables, cada una con su valoración.
  const starsHtml = [1, 2, 3, 4, 5]
    .map(
      (stars) =>
        `<a href="${baseUrl}/api/review-confirm/${customer.id}?auto=1&rating=${stars}&redirect=${encodeURIComponent(googleLink)}" target="_blank" style="display:inline-block;font-size:40px;text-decoration:none;color:#f59e0b;padding:0 4px;transition:opacity .15s;" onmouseover="this.style.opacity='.7'" onmouseout="this.style.opacity='1'">★</a>`,
    )
    .join('');

  let bodyHtml = business.emailTemplate || `
    <h1 style="margin:0 0 8px;font-size:24px;color:#0a0a0a;">{{nombre}}</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#737373;line-height:1.5;">
      En <strong>{{negocio}}</strong> valoramos mucho tu opini&oacute;n.
      &iquest;Podr&iacute;as dedicar un minuto a dejar una rese&ntilde;a en Google?
    </p>
  `;

  // Reemplazamos las variables del template.
  bodyHtml = bodyHtml
    .replace(/\{\{nombre\}\}/g, customerName ? `Hola, ${customerName}` : 'Gracias por tu visita')
    .replace(/\{\{negocio\}\}/g, businessName)
    .replace(/\{\{link\}\}/g, reviewUrl);

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

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('Falta RESEND_API_KEY en .env.local');

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Revly <invitaciones@revly.es>',
      to: email,
      subject: `${customerName ? `${customerName}, ` : ''}cuéntanos tu experiencia en ${businessName}`,
      html,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Error al enviar email: ${errorBody}`);
  }

  // Solo actualizamos el estado si el email se envió correctamente.
  await prisma.customer.update({
    where: { id: customerId },
    data: {
      status: 'invited',
      invitedCount: { increment: 1 },
      lastInvitedAt: new Date(),
    },
  });

  return { success: true };
};

// Envía invitaciones en lote y devuelve cuántas se enviaron y cuántas fallaron.
export const sendBatchInvitations = async (customerIds: string[]) => {
  let sent = 0;
  let failed = 0;

  for (const customerId of customerIds) {
    try {
      await sendInvitation(customerId);
      sent++;
    } catch {
      failed++;
    }
  }

  return { sent, failed };
};

// Genera un enlace de WhatsApp con el mensaje de invitación a reseñar.
export const getWhatsAppLink = async (customerId: string) => {
  const userId = await requireUserId();

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, business: { userId } },
    include: { business: true },
  });
  if (!customer) throw new Error('Cliente no encontrado');
  if (!customer.phone) throw new Error('El cliente no tiene teléfono');

  const { name, phone, business } = customer;
  const googleLink = business.googleLink;
  const businessName = business.name;
  const customerName = name ?? '';

  if (!googleLink) {
    throw new Error('El negocio no tiene enlace de Google Reviews configurado');
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const reviewUrl = `${baseUrl}/api/review-confirm/${customer.id}?auto=1&rating=5&redirect=${encodeURIComponent(googleLink)}`;

  // Normalizamos el teléfono: sin espacios, guiones, paréntesis ni prefijo +.
  const cleanPhone = phone.replace(/[\s\-()\+]/g, '');
  const waPhone = cleanPhone.startsWith('00')
    ? cleanPhone.replace(/^00/, '')
    : cleanPhone.startsWith('34') || cleanPhone.startsWith('+34')
      ? cleanPhone.replace(/^\+/, '')
      : cleanPhone;

  const message = `Hola ${customerName ? `${customerName}, ` : ''}¿cómo valorarías tu experiencia en ${businessName}?\n\n${reviewUrl}`;

  return {
    waLink: `https://wa.me/${waPhone}?text=${encodeURIComponent(message)}`,
    reviewUrl,
  };
};
