'use server';

import prisma from '@/lib/db';

export async function addCustomer(data: {
  businessId: string;
  name: string;
  email: string;
  phone?: string;
}) {
  // TODO: obtener userId de Supabase
  const userId = '';
  if (!userId) throw new Error('No autenticado');

  const business = await prisma.business.findFirst({
    where: { id: data.businessId, userId },
  });
  if (!business) throw new Error('Negocio no encontrado');

  const customer = await prisma.customer.create({
    data: {
      id: crypto.randomUUID(),
      name: data.name,
      email: data.email,
      phone: data.phone ?? null,
      businessId: data.businessId,
    } as any,
  });

  return customer;
}

export async function getCustomers(businessId: string) {
  // TODO: obtener userId de Supabase
  const userId = '';
  if (!userId) return [];

  return prisma.customer.findMany({
    where: { businessId, business: { userId } },
  });
}
