'use server';

import prisma from '@/lib/db';
import { createClient } from '@/lib/supabase/server';
import { notifyCustomerDiscount } from '@/lib/notifications';

// Suma 1 punto canjeando el código del ticket del kiosko.
// Antifraude: 1 punto por cliente y día, y un ticket solo vale una vez al día.
// Devuelve { success: false, error } para errores esperados (no lanza).
export const claimTicketPoint = async (
  customerId: string,
  slug: string,
  ticketCode: string,
) => {
  const normalizedCode = ticketCode.trim();
  if (!normalizedCode) {
    return { success: false as const, error: 'Introduce el número de tu ticket' };
  }
  if (normalizedCode.length < 2) {
    return {
      success: false as const,
      error: 'El número de ticket es demasiado corto',
    };
  }

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: { business: { select: { id: true, slug: true, name: true } } },
  });
  if (!customer || customer.business.slug !== slug) {
    return { success: false as const, error: 'Cliente no encontrado' };
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
    return {
      success: false as const,
      error: 'Ya has sumado tu punto de hoy. Vuelve mañana.',
    };
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
    return { success: false as const, error: 'Ese ticket ya se ha usado hoy.' };
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

  // Aviso de descuento conseguido (solo si llega a un hito de 5 puntos).
  await notifyCustomerDiscount({
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    whatsappOptIn: customer.whatsappOptIn,
    businessName: customer.business.name,
    points: updatedPoints,
    discountCode: customer.discountCode,
  });

  return { success: true as const, points: updatedPoints };
};

// Suma 1 punto manualmente desde el dashboard (el empleado lo confirma en caja).
export const addPointToCustomer = async (customerId: string) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false as const, error: 'No autenticado' };

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, business: { userId: user.id } },
    include: { business: { select: { name: true } } },
  });
  if (!customer) {
    return { success: false as const, error: 'Cliente no encontrado' };
  }

  const updatedPoints = customer.points + 1;

  await prisma.customer.update({
    where: { id: customerId },
    data: { points: { increment: 1 } },
  });

  await notifyCustomerDiscount({
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    whatsappOptIn: customer.whatsappOptIn,
    businessName: customer.business.name,
    points: updatedPoints,
    discountCode: customer.discountCode,
  });

  return { success: true as const, points: updatedPoints };
};

// Resta 1 punto manualmente (corrección). No notifica al cliente.
export const subtractPointFromCustomer = async (customerId: string) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false as const, error: 'No autenticado' };

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, business: { userId: user.id } },
    select: { id: true, points: true },
  });
  if (!customer) {
    return { success: false as const, error: 'Cliente no encontrado' };
  }

  const updatedPoints = Math.max(0, customer.points - 1);
  await prisma.customer.update({
    where: { id: customerId },
    data: { points: updatedPoints },
  });

  return { success: true as const, points: updatedPoints };
};

// Fija el total de puntos (corrección). No notifica al cliente.
export const setCustomerPoints = async (customerId: string, points: number) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false as const, error: 'No autenticado' };

  const value = Math.floor(points);
  if (!Number.isFinite(value) || value < 0) {
    return { success: false as const, error: 'Valor de puntos no válido' };
  }

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, business: { userId: user.id } },
    select: { id: true },
  });
  if (!customer) {
    return { success: false as const, error: 'Cliente no encontrado' };
  }

  await prisma.customer.update({
    where: { id: customerId },
    data: { points: value },
  });

  return { success: true as const, points: value };
};
