// Notificaciones al cliente por email y WhatsApp. Cada evento envía por los
// dos canales a la vez; si uno no está configurado, el otro sigue funcionando.

import { sendEmail } from '@/lib/email';
import {
  sendWhatsAppTemplate,
  WHATSAPP_TEMPLATE_WELCOME,
  WHATSAPP_TEMPLATE_POINTS,
} from '@/lib/whatsapp';

// Plantilla HTML común para las notificaciones.
function emailLayout(title: string, body: string): string {
  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#111827;max-width:480px;margin:0 auto;padding:24px;">
      <h1 style="font-size:20px;margin:0 0 12px;">${title}</h1>
      ${body}
      <p style="font-size:12px;color:#9ca3af;margin-top:24px;">Enviado a través de Revly</p>
    </div>
  `;
}

// Avisa al cliente de que se ha registrado (email + WhatsApp).
export async function notifyCustomerRegistered({
  name,
  email,
  phone,
  businessName,
  points,
}: {
  name: string | null;
  email: string;
  phone: string | null;
  businessName: string;
  points: number;
}) {
  const displayName = name || 'cliente';

  await Promise.all([
    sendEmail({
      to: email,
      subject: `¡Bienvenido/a a ${businessName}!`,
      html: emailLayout(
        `¡Hola, ${displayName}!`,
        `<p>Te has registrado en el programa de puntos de <strong>${businessName}</strong>.</p>
         <p>Ya tienes <strong>${points} punto${points !== 1 ? 's' : ''}</strong>. Cada 5 puntos consigues un 10% de descuento.</p>
         <p>Guarda tu código de descuento y muéstralo en caja cuando quieras canjearlo.</p>`,
      ),
    }),
    sendWhatsAppTemplate({
      to: phone,
      templateName: WHATSAPP_TEMPLATE_WELCOME,
      bodyParams: [displayName, businessName, String(points)],
    }),
  ]);
}

// Avisa al cliente de que ha sumado un punto (email + WhatsApp).
export async function notifyCustomerPoints({
  name,
  email,
  phone,
  businessName,
  points,
}: {
  name: string | null;
  email: string;
  phone: string | null;
  businessName: string;
  points: number;
}) {
  const displayName = name || 'cliente';

  await Promise.all([
    sendEmail({
      to: email,
      subject: `Has sumado un punto en ${businessName}`,
      html: emailLayout(
        `¡Gracias, ${displayName}!`,
        `<p>Has sumado un punto en <strong>${businessName}</strong>.</p>
         <p>Ahora tienes <strong>${points} punto${points !== 1 ? 's' : ''}</strong>.</p>`,
      ),
    }),
    sendWhatsAppTemplate({
      to: phone,
      templateName: WHATSAPP_TEMPLATE_POINTS,
      bodyParams: [displayName, businessName, String(points)],
    }),
  ]);
}
