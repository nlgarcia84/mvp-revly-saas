'use server';

import prisma from '@/lib/db';

export async function createBusiness(data: { name: string; googleLink?: string }) {
  // TODO: obtener userId de Supabase
  const userId = '';
  if (!userId) throw new Error('No autenticado');

  const business = await prisma.business.create({
    data: {
      name: data.name,
      googleLink: data.googleLink ?? null,
      userId,
    },
  });

  return business;
}

export async function getBusinesses() {
  // TODO: obtener userId de Supabase
  const userId = '';
  if (!userId) return [];

  return prisma.business.findMany({
    where: { userId },
    include: { _count: { select: { customers: true } } },
  });
}
