'use server';

import prisma from '@/lib/db';
import { createClient } from '@/lib/supabase/server';
import { generateDiscountCode } from '@/lib/discount-code';
import { POINTS_PER_REDEMPTION } from '@/lib/loyalty';

// Canjea la recompensa de un cliente desde el dashboard (dueño autenticado).
// El empresario teclea el código que le da el cliente en caja. Al canjear,
// se descuentan los puntos y se genera un código nuevo (el anterior queda
// inválido). Devuelve { success: false, error } para errores esperados.
export const redeemDiscountCodeInDashboard = async (
  businessId: string,
  code: string,
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

  const normalizedCode = code.trim().toUpperCase();
  if (!normalizedCode) {
    return { success: false as const, error: 'Introduce el código del cliente' };
  }

  const customer = await prisma.customer.findFirst({
    where: { discountCode: normalizedCode, businessId: business.id },
    select: { id: true, name: true, points: true },
  });
  if (!customer) {
    return {
      success: false as const,
      error: 'Código no válido para este negocio',
    };
  }
  if (customer.points < POINTS_PER_REDEMPTION) {
    return {
      success: false as const,
      error: `El cliente solo tiene ${customer.points} punto(s). Necesita ${POINTS_PER_REDEMPTION}.`,
    };
  }

  return redeemCore(customer.id, business.id, customer.name);
};

// Canjea la recompensa del cliente identificado por su QR (flujo de caja).
// El empleado ve "RECOMPENSA DISPONIBLE" y pulsa "Canjear recompensa".
export const redeemRewardByEmployee = async (
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

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, businessId: business.id },
    select: { id: true, name: true, points: true },
  });
  if (!customer) {
    return { success: false as const, error: 'Cliente no encontrado' };
  }
  if (customer.points < POINTS_PER_REDEMPTION) {
    return {
      success: false as const,
      error: `El cliente solo tiene ${customer.points} punto(s). Necesita ${POINTS_PER_REDEMPTION}.`,
    };
  }

  return redeemCore(customer.id, business.id, customer.name);
};

// Núcleo del canje. Usa un updateMany condicional para que el descuento de
// puntos sea atómico: si dos empleados canjean a la vez, solo el primero
// consigue rebajar los puntos (el segundo recibe "sin puntos suficientes").
// Genera un código nuevo (el anterior queda inválido) y registra el canje
// (-5) en el historial de movimientos.
async function redeemCore(
  customerId: string,
  businessId: string,
  customerName: string | null,
) {
  const newDiscountCode = generateDiscountCode();

  let remainingPoints: number;
  try {
    remainingPoints = await prisma.$transaction(async (tx) => {
      const updated = await tx.customer.updateMany({
        where: { id: customerId, points: { gte: POINTS_PER_REDEMPTION } },
        data: {
          points: { decrement: POINTS_PER_REDEMPTION },
          discountCode: newDiscountCode,
        },
      });
      if (updated.count !== 1) {
        throw new Error('INSUFFICIENT_POINTS');
      }

      await tx.pointMovement.create({
        data: {
          type: 'redeem',
          points: -POINTS_PER_REDEMPTION,
          day: null,
          customerId,
          businessId,
        },
      });

      const after = await tx.customer.findUnique({
        where: { id: customerId },
        select: { points: true },
      });
      return after?.points ?? 0;
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'INSUFFICIENT_POINTS') {
      return {
        success: false as const,
        error: 'El cliente no tiene puntos suficientes para canjear.',
      };
    }
    throw error;
  }

  return {
    success: true as const,
    customerName: customerName ?? 'Cliente',
    newCode: newDiscountCode,
    remainingPoints,
  };
}
