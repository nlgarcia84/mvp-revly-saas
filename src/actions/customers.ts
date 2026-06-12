'use server';

import prisma from '@/lib/db';
import { createClient } from '@/lib/supabase/server';

export const addCustomer = async (data: {
  businessId: string;
  name: string;
  email: string;
  phone: string;
}) => {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id ?? '';
  if (!userId) throw new Error('No autenticado');

  const business = await prisma.business.findFirst({
    where: { id: data.businessId, userId },
  });
  if (!business) throw new Error('Negocio no encontrado');

  const customer = await prisma.customer.create({
    data: {
      name: data.name || null,
      email: data.email,
      phone: data.phone,
      businessId: data.businessId,
    },
  });

  return customer;
};

export const getCustomers = async (businessId: string) => {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id ?? '';
  if (!userId) return [];

  return prisma.customer.findMany({
    where: { businessId, business: { userId } },
  });
};
