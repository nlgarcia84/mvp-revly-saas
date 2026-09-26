'use server';

import prisma from '@/lib/db';
import {
  sendWhatsAppTemplate,
  WHATSAPP_TEMPLATE_POINTS,
} from '@/lib/whatsapp';

// Suma 1 punto canjeando el código del ticket del kiosko.
// Antifraude: 1 punto por cliente y día, y un ticket solo vale una vez al día.
export const claimTicketPoint = async (
  customerId: string,
  slug: string,
  ticketCode: string,
) => {
  const normalizedCode = ticketCode.trim();
  if (!normalizedCode) throw new Error('Introduce el número de tu ticket');
  if (normalizedCode.length < 2) {
    throw new Error('El número de ticket es demasiado corto');
  }

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: { business: { select: { id: true, slug: true, name: true } } },
  });
  if (!customer || customer.business.slug !== slug) {
    throw new Error('Cliente no encontrado');
  }

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  // 1) El cliente no puede sumar más de un punto al día.
  const alreadyClaimedToday = await prisma.pointClaim.findFirst({
    where: {
      customerId,
      businessId: customer.business.id,
      claimedAt: { gte: startOfDay },
    },
  });
  if (alreadyClaimedToday) {
    throw new Error('Ya has sumado tu punto de hoy. Vuelve mañana.');
  }

  // 2) El mismo ticket no puede usarse dos veces el mismo día.
  const ticketAlreadyUsed = await prisma.pointClaim.findFirst({
    where: {
      businessId: customer.business.id,
      ticketCode: normalizedCode,
      claimedAt: { gte: startOfDay },
    },
  });
  if (ticketAlreadyUsed) {
    throw new Error('Ese ticket ya se ha usado hoy.');
  }

  const updatedPoints = customer.points + 1;

  await prisma.$transaction([
    prisma.pointClaim.create({
      data: {
        ticketCode: normalizedCode,
        businessId: customer.business.id,
        customerId,
      },
    }),
    prisma.customer.update({
      where: { id: customerId },
      data: { points: { increment: 1 } },
    }),
  ]);

  // Aviso por WhatsApp del nuevo punto (si está configurado).
  await sendWhatsAppTemplate({
    to: customer.phone,
    templateName: WHATSAPP_TEMPLATE_POINTS,
    bodyParams: [
      customer.name ?? 'cliente',
      customer.business.name,
      String(updatedPoints),
    ],
  });

  return { success: true, points: updatedPoints };
};
