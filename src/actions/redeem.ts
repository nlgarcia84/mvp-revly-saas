'use server';

import prisma from '@/lib/db';
import { createClient } from '@/lib/supabase/server';

function generateDiscountCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'REVLY-';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export const checkDiscountCode = async (
  code: string,
  pin: string,
  slug: string,
) => {
  const business = await prisma.business.findUnique({
    where: { slug },
    select: { id: true, verificationPin: true, name: true },
  });
  if (!business) throw new Error('Negocio no encontrado');
  if (business.verificationPin !== pin) throw new Error('PIN incorrecto');

  const customer = await prisma.customer.findFirst({
    where: { discountCode: code, businessId: business.id },
    select: { id: true, name: true, points: true, discountCode: true },
  });
  if (!customer) throw new Error('Código de descuento no válido');

  // Check they have at least 5 points to redeem
  if (customer.points < 5) {
    throw new Error('El cliente no tiene suficientes puntos para canjear');
  }

  return {
    valid: true,
    customerId: customer.id,
    customerName: customer.name,
    points: customer.points,
  };
};

export const redeemDiscountCode = async (
  code: string,
  pin: string,
  slug: string,
) => {
  const business = await prisma.business.findUnique({
    where: { slug },
    select: { id: true, verificationPin: true },
  });
  if (!business) throw new Error('Negocio no encontrado');
  if (business.verificationPin !== pin) throw new Error('PIN incorrecto');

  const customer = await prisma.customer.findFirst({
    where: { discountCode: code, businessId: business.id },
    select: { id: true, points: true },
  });
  if (!customer) throw new Error('Código de descuento no válido');
  if (customer.points < 5) throw new Error('Puntos insuficientes');

  const newCode = generateDiscountCode();

  await prisma.customer.update({
    where: { id: customer.id },
    data: {
      points: { decrement: 5 },
      discountCode: newCode,
    },
  });

  return { success: true, newCode };
};

export const updateVerificationPin = async (
  businessId: string,
  pin: string,
) => {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id ?? '';
  if (!userId) throw new Error('No autenticado');

  const business = await prisma.business.findFirst({
    where: { id: businessId, userId },
  });
  if (!business) throw new Error('Negocio no encontrado');

  if (pin && (pin.length !== 4 || !/^\d{4}$/.test(pin))) {
    throw new Error('El PIN debe tener exactamente 4 dígitos');
  }

  await prisma.business.update({
    where: { id: businessId },
    data: { verificationPin: pin || null },
  });

  return { success: true };
};

export const getBusinessVerificationInfo = async (slug: string) => {
  const business = await prisma.business.findUnique({
    where: { slug },
    select: { name: true, verificationPin: true },
  });
  if (!business) return null;
  return {
    name: business.name,
    hasPin: business.verificationPin !== null,
  };
};
