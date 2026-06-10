'use server';

import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/db';

export async function addCustomer(data: {
  businessId: string;
  name: string;
  email: string;
  phone?: string;
}) {
  const { userId } = await auth();
  if (!userId) throw new Error('No autenticado');

  const business = await prisma.business.findFirst({
    where: { id: data.businessId, userId },
  });
  if (!business) throw new Error('Negocio no encontrado');

  const customer = await prisma.customer.create({
    data: {
      name: data.name,
      email: data.email,
      phone: data.phone ?? null,
      businessId: data.businessId,
    },
  });

  return customer;
}

export async function getCustomers(businessId: string) {
  const { userId } = await auth();
  if (!userId) return [];

  return prisma.customer.findMany({
    where: { businessId, business: { userId } },
  });
}
