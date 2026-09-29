'use server';

import { Prisma } from '@prisma/client';
import prisma from '@/lib/db';
import { createClient } from '@/lib/supabase/server';
import { notifyCustomerDiscount } from '@/lib/notifications';
import { POINTS_CAP, todayKey } from '@/lib/loyalty';

// Comprueba si un error de Prisma es una violación de unicidad (P2002),
// que usamos para impedir sumar dos puntos el mismo día (clave única
// sobre [customerId, businessId, type, day] en PointMovement).
function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

// Suma 1 punto manualmente desde el dashboard (el empleado lo confirma en caja).
export const addPointToCustomer = async (customerId: string) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false as const, error: 'No autenticado' };

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, business: { userId: user.id } },
    select: { id: true, businessId: true },
  });
  if (!customer) {
    return { success: false as const, error: 'Cliente no encontrado' };
  }

  return grantPoint(customer.id, customer.businessId);
};

// Suma 1 punto al cliente identificado por su QR (flujo de caja).
// El empleado debe estar autenticado y el negocio debe ser suyo.
export const addPointByEmployee = async (
  customerId: string,
  businessId: string,
) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false as const, error: 'No autenticado' };

  const business = await prisma.business.findFirst({
    where: { id: businessId, userId: user.id },
    select: { id: true },
  });
  if (!business) {
    return { success: false as const, error: 'Negocio no encontrado' };
  }

  return grantPoint(customerId, business.id);
};

// Núcleo compartido para sumar un punto. Validación completa en servidor:
//   - cliente pertenece al negocio
//   - programa de puntos activo
//   - límite máximo de puntos (POINTS_CAP)
//   - límite de 1 punto al día (clave única a nivel de BD → sin carreras)
// Registra el movimiento en PointMovement (historial) y avisa al llegar
// a un hito de descuento.
async function grantPoint(customerId: string, businessId: string) {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, businessId },
    select: {
      id: true, name: true, email: true, phone: true,
      whatsappOptIn: true, points: true,
      discountCode: true,
      business: { select: { name: true, loyaltyEnabled: true } },
    },
  });
  if (!customer) {
    return { success: false as const, error: 'Cliente no encontrado' };
  }

  if (!customer.business.loyaltyEnabled) {
    return {
      success: false as const,
      error: 'El programa de puntos no está activo',
    };
  }

  if (customer.points >= POINTS_CAP) {
    return {
      success: false as const,
      error: `Ya tiene el máximo de ${POINTS_CAP} puntos. Canjee su descuento.`,
    };
  }

  const day = todayKey();

  try {
    const updatedPoints = await prisma.$transaction(async (tx) => {
      // La creación del movimiento falla (P2002) si ya sumó hoy.
      await tx.pointMovement.create({
        data: { type: 'earn', points: 1, day, customerId, businessId },
      });
      const updated = await tx.customer.update({
        where: { id: customerId },
        data: { points: { increment: 1 } },
      });
      return updated.points;
    });

    try {
      await notifyCustomerDiscount({
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        whatsappOptIn: customer.whatsappOptIn,
        businessName: customer.business.name,
        points: updatedPoints,
        discountCode: customer.discountCode,
      });
    } catch (notifError) {
      console.error('Error notificando descuento:', notifError);
    }

    return { success: true as const, points: updatedPoints };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return {
        success: false as const,
        error: 'Ya has sumado tu punto de hoy. Vuelve mañana.',
      };
    }
    throw error;
  }
}

// Resta 1 punto manualmente (corrección). No notifica al cliente.
// Registra el ajuste en PointMovement solo si realmente resta un punto.
export const subtractPointFromCustomer = async (customerId: string) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false as const, error: 'No autenticado' };

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, business: { userId: user.id } },
    select: { id: true, points: true, businessId: true },
  });
  if (!customer) {
    return { success: false as const, error: 'Cliente no encontrado' };
  }

  const updatedPoints = Math.max(0, customer.points - 1);
  const delta = updatedPoints - customer.points;

  await prisma.$transaction(async (tx) => {
    if (delta !== 0) {
      await tx.pointMovement.create({
        data: {
          type: 'adjust',
          points: delta,
          day: null,
          businessId: customer.businessId,
          customerId,
        },
      });
    }
    await tx.customer.update({
      where: { id: customerId },
      data: { points: updatedPoints },
    });
  });

  return { success: true as const, points: updatedPoints };
};

// Fija el total de puntos (corrección). No notifica al cliente.
// Registra el ajuste en PointMovement para mantener el historial.
export const setCustomerPoints = async (customerId: string, points: number) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false as const, error: 'No autenticado' };

  const value = Math.floor(points);
  if (!Number.isFinite(value) || value < 0 || value > POINTS_CAP) {
    return { success: false as const, error: `Valor de puntos no válido (0-${POINTS_CAP})` };
  }

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, business: { userId: user.id } },
    select: { id: true, points: true, businessId: true },
  });
  if (!customer) {
    return { success: false as const, error: 'Cliente no encontrado' };
  }

  const delta = value - customer.points;

  await prisma.$transaction(async (tx) => {
    if (delta !== 0) {
      await tx.pointMovement.create({
        data: {
          type: 'adjust',
          points: delta,
          day: null,
          businessId: customer.businessId,
          customerId,
        },
      });
    }
    await tx.customer.update({
      where: { id: customerId },
      data: { points: value },
    });
  });

  return { success: true as const, points: value };
};
