// Notificaciones al cliente. El registro y los puntos avisan por email; el
// WhatsApp se reserva para hitos (descuento conseguido) y solo si el cliente
// dio su opt-in. La petición de reseña se programa para el día siguiente.

import { sendEmail } from '@/lib/email';
import { buildReviewEmail } from '@/lib/review-email';
import {
  sendWhatsAppTemplate,
  WHATSAPP_TEMPLATE_DISCOUNT,
} from '@/lib/whatsapp';

// Espera antes de pedir la reseña (al día siguiente del registro).
const REVIEW_DELAY_MS = 24 * 60 * 60 * 1000;

// Plantilla HTML común para las notificaciones por email.
function emailLayout(title: string, body: string): string {
  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#111827;max-width:480px;margin:0 auto;padding:24px;">
      <h1 style="font-size:20px;margin:0 0 12px;">${title}</h1>
      ${body}
      <p style="font-size:12px;color:#9ca3af;margin-top:24px;">Enviado a través de Revly</p>
    </div>
  `;
}

// Avisa al cliente de que se ha registrado (solo email; WhatsApp no, para no
// ser intrusivos en el onboarding).
export async function notifyCustomerRegistered({
  name,
  email,
  businessName,
  points,
}: {
  name: string | null;
  email: string;
  businessName: string;
  points: number;
}) {
  const displayName = name || 'cliente';

  await sendEmail({
    to: email,
    subject: `¡Bienvenido/a a ${businessName}!`,
    html: emailLayout(
      `¡Hola, ${displayName}!`,
      `<p>Te has registrado en el programa de puntos de <strong>${businessName}</strong>.</p>
       <p>Ya tienes <strong>${points} punto${points !== 1 ? 's' : ''}</strong>. Cada 5 puntos consigues un 10% de descuento.</p>
       <p>Guarda tu código de descuento y muéstralo en caja cuando quieras canjearlo.</p>`,
    ),
  });
}

// Avisa al cliente de que ha sumado un punto. Email siempre; WhatsApp solo si
// dio su opt-in y además ha conseguido un descuento (hito, no cada punto).
export async function notifyCustomerPoints({
  name,
  email,
  phone,
  whatsappOptIn,
  businessName,
  points,
}: {
  name: string | null;
  email: string;
  phone: string | null;
  whatsappOptIn: boolean;
  businessName: string;
  points: number;
}) {
  const displayName = name || 'cliente';
  const reachedDiscount = points > 0 && points % 5 === 0;

  const tasks: Promise<boolean>[] = [
    sendEmail({
      to: email,
      subject: `Has sumado un punto en ${businessName}`,
      html: emailLayout(
        `¡Gracias, ${displayName}!`,
        `<p>Has sumado un punto en <strong>${businessName}</strong>.</p>
         <p>Ahora tienes <strong>${points} punto${points !== 1 ? 's' : ''}</strong>.</p>
         ${
           reachedDiscount
             ? `<p>¡Ya tienes un <strong>10% de descuento</strong> disponible! Muéstralo en caja.</p>`
             : ''
         }`,
      ),
    }),
  ];

  if (whatsappOptIn && reachedDiscount) {
    tasks.push(
      sendWhatsAppTemplate({
        to: phone,
        templateName: WHATSAPP_TEMPLATE_DISCOUNT,
        bodyParams: [displayName, businessName, String(points)],
      }),
    );
  }

  await Promise.all(tasks);
}

// Programa el email de invitación a reseñar para el día siguiente (solo email).
export async function scheduleReviewRequest({
  customerId,
  name,
  email,
  businessName,
  googleLink,
  emailTemplate,
}: {
  customerId: string;
  name: string | null;
  email: string;
  businessName: string;
  googleLink: string | null;
  emailTemplate?: string | null;
}) {
  if (!email || !googleLink) return false;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const { subject, html } = buildReviewEmail({
    customerId,
    customerName: name ?? '',
    businessName,
    googleLink,
    emailTemplate,
    baseUrl,
  });

  return sendEmail({
    to: email,
    subject,
    html,
    scheduledAt: new Date(Date.now() + REVIEW_DELAY_MS).toISOString(),
  });
}
