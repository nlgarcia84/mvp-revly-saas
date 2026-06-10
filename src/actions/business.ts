'use server';

import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/db';

export async function createBusiness(data: { name: string; googleLink?: string }) {
  const { userId } = await auth();
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
  const { userId } = await auth();
  if (!userId) return [];

  return prisma.business.findMany({
    where: { userId },
    include: { _count: { select: { customers: true } } },
  });
}
