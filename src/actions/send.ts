'use server';

import prisma from '@/lib/db';
import { createClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email';
import { buildReviewEmail } from '@/lib/review-email';

// Devuelve el id del usuario autenticado o lanza si no hay sesión.
async function requireUserId(): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');
  return user.id;
}

// Envía el email de invitación a reseñar y marca al cliente como invitado.
export const sendInvitation = async (customerId: string) => {
  const userId = await requireUserId();

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, business: { userId } },
    include: { business: true },
  });
  if (!customer) throw new Error('Cliente no encontrado');

  const googleLink = customer.business.googleLink;
  if (!googleLink) {
    throw new Error('El negocio no tiene enlace de Google Reviews configurado');
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const { subject, html } = buildReviewEmail({
    customerId: customer.id,
    customerName: customer.name ?? '',
    businessName: customer.business.name,
    googleLink,
    emailTemplate: customer.business.emailTemplate,
    baseUrl,
  });

  const sent = await sendEmail({ to: customer.email, subject, html });
  if (!sent) throw new Error('No se pudo enviar el email');

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
