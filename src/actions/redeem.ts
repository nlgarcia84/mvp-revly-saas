'use server';

import prisma from '@/lib/db';
import { createClient } from '@/lib/supabase/server';
import { generateDiscountCode } from '@/lib/discount-code';

// Puntos necesarios para canjear el descuento.
const POINTS_PER_REDEMPTION = 5;

// Canjea el descuento de un cliente desde el dashboard (dueño autenticado).
// El empresario teclea el código que le da el cliente en caja. Al canjear,
// se descuentan 5 puntos y se genera un código nuevo (el anterior queda inválido).
export const redeemDiscountCodeInDashboard = async (
  businessId: string,
  code: string,
) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');

  const business = await prisma.business.findFirst({
    where: { id: businessId, userId: user.id },
    select: { id: true },
  });
  if (!business) throw new Error('Negocio no encontrado');

  const normalizedCode = code.trim().toUpperCase();
  if (!normalizedCode) throw new Error('Introduce el código del cliente');

  const customer = await prisma.customer.findFirst({
    where: { discountCode: normalizedCode, businessId: business.id },
    select: { id: true, name: true, points: true },
  });
  if (!customer) throw new Error('Código no válido para este negocio');
  if (customer.points < POINTS_PER_REDEMPTION) {
    throw new Error('El cliente no tiene puntos suficientes (necesita 5)');
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
    success: true,
    customerName: customer.name ?? 'Cliente',
    newCode: newDiscountCode,
    remainingPoints: customer.points - POINTS_PER_REDEMPTION,
  };
};
