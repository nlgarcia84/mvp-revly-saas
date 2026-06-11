'use server';

import prisma from '@/lib/db';

export async function sendReviewRequest(businessId: string) {
  // TODO: obtener userId de Supabase
  const userId = '';
  if (!userId) throw new Error('No autenticado');

  const business = await prisma.business.findFirst({
    where: { id: businessId, userId },
  });
  if (!business) throw new Error('Negocio no encontrado');

  return { ok: true, googleLink: business.googleLink };
}
