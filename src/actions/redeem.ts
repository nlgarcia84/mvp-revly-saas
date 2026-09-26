'use server';

import prisma from '@/lib/db';
import { createClient } from '@/lib/supabase/server';
import { generateDiscountCode } from '@/lib/discount-code';

// Puntos necesarios para canjear el descuento.
const POINTS_PER_REDEMPTION = 5;

// Canjea el descuento de un cliente desde el dashboard (dueño autenticado).
// El empresario teclea el código que le da el cliente en caja. Al canjear,
// se descuentan 5 puntos y se genera un código nuevo (el anterior queda inválido).
// Devuelve { success: false, error } para errores esperados (no lanza), porque
// en producción Next oculta el mensaje de los errores lanzados.
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

  const newDiscountCode = generateDiscountCode();

  await prisma.customer.update({
    where: { id: customer.id },
    data: {
      points: { decrement: POINTS_PER_REDEMPTION },
      discountCode: newDiscountCode,
    },
  });

  return {
    success: true as const,
    customerName: customer.name ?? 'Cliente',
    newCode: newDiscountCode,
    remainingPoints: customer.points - POINTS_PER_REDEMPTION,
  };
};
