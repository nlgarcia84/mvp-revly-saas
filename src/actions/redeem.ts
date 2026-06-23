'use server';

import prisma from '@/lib/db';
import { createClient } from '@/lib/supabase/server';

/**
 * generateDiscountCode
 *
 * Genera un código de descuento único de 8 caracteres con formato REVLY-XXXX.
 * Se usa para identificar a cada cliente y canjear su descuento en el negocio.
 * Los códigos usan caracteres seguros (sin vocales para evitar palabras
 * ofensivas, sin 0/O/1/I/L para evitar confusiones al leerlos en voz alta).
 */
function generateDiscountCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'REVLY-';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/**
 * checkDiscountCode
 *
 * Verifica que un código de descuento sea válido para un negocio.
 * Comprueba:
 *   1. Que el negocio exista y tenga PIN configurado
 *   2. Que el PIN coincida
 *   3. Que el código de descuento exista y pertenezca a ese negocio
 *   4. Que el cliente tenga al menos 5 puntos para canjear
 *
 * Es una Server Action pública (sin auth) porque la protege el PIN
 * del negocio. El empleado introduce el PIN desde su móvil.
 */
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

/**
 * redeemDiscountCode
 *
 * Ejecuta el canje del descuento:
 *   1. Verifica el PIN del negocio
 *   2. Verifica que el código exista y tenga puntos suficientes
 *   3. Descarga 5 puntos al cliente
 *   4. Genera un código de descuento NUEVO (el anterior queda inválido)
 *
 * Una vez canjeado, el código anterior ya no sirve. Esto evita que
 * el cliente reutilice una captura de pantalla del código viejo.
 * El nuevo código se muestra al empleado para que lo aplique en caja.
 */
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

/**
 * updateVerificationPin
 *
 * Guarda o actualiza el PIN de verificación del negocio.
 * Requiere autenticación (solo el dueño del negocio).
 * El PIN debe tener exactamente 4 dígitos numéricos.
 * Si se envía vacío, se elimina el PIN (desactiva verificación).
 */
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

/**
 * getBusinessVerificationInfo
 *
 * Devuelve información sobre la verificación de un negocio.
 * Es pública (sin auth) porque se usa en la página de verificación
 * para saber si el negocio tiene PIN configurado.
 * Devuelve el nombre del negocio y si tiene PIN activo.
 */
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
