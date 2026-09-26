'use server';

import prisma from '@/lib/db';
import { createClient } from '@/lib/supabase/server';
import { generateDiscountCode } from '@/lib/discount-code';

// Puntos necesarios para canjear el descuento.
const POINTS_PER_REDEMPTION = 5;

// Comprueba que un código de descuento sea válido para el negocio.
// Es pública: la protege el PIN que introduce el empleado en caja.
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
  if (customer.points < POINTS_PER_REDEMPTION) {
    throw new Error('El cliente no tiene suficientes puntos para canjear');
  }

  return {
    valid: true,
    customerId: customer.id,
    customerName: customer.name,
    points: customer.points,
  };
};

// Ejecuta el canje: descuenta los puntos y genera un código nuevo, de modo
// que el anterior queda inválido y no sirve una captura de pantalla.
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
  if (customer.points < POINTS_PER_REDEMPTION) {
    throw new Error('Puntos insuficientes');
  }

  const newDiscountCode = generateDiscountCode();

  await prisma.customer.update({
    where: { id: customer.id },
    data: {
      points: { decrement: POINTS_PER_REDEMPTION },
      discountCode: newDiscountCode,
    },
  });

  return { success: true, newCode: newDiscountCode };
};

// Guarda o actualiza el PIN de 4 dígitos del negocio. Solo el dueño puede.
// Un PIN vacío desactiva la verificación en caja.
export const updateVerificationPin = async (
  businessId: string,
  pin: string,
) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user?.id ?? '';
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

// Devuelve el nombre del negocio y si tiene PIN activo (para la página de canje).
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
