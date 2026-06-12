'use server';

import prisma from '@/lib/db';
import { createClient } from '@/lib/supabase/server';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function generateSlug(name: string): Promise<string> {
  const base = slugify(name) || 'negocio';
  let slug = base;
  let counter = 1;
  while (await prisma.business.findUnique({ where: { slug } })) {
    slug = `${base}-${counter++}`;
  }
  return slug;
}

async function getUserId(): Promise<string> {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id ?? '';
}

export const createBusiness = async (data: {
  name: string;
  googleLink?: string;
}) => {
  const userId = await getUserId();
  if (!userId) throw new Error('No autenticado');

  const slug = await generateSlug(data.name);

  const business = await prisma.business.create({
    data: {
      name: data.name,
      slug,
      googleLink: data.googleLink ?? null,
      userId,
    },
  });

  return business;
};

export const getBusinesses = async () => {
  const userId = await getUserId();
  if (!userId) return [];

  return prisma.business.findMany({
    where: { userId },
    include: { _count: { select: { customers: true } } },
  });
};

/**
 * Busca un negocio por su slug para la página pública.
 */
export const getBusinessBySlug = async (slug: string) => {
  return prisma.business.findUnique({
    where: { slug },
  });
};

/**
 * Crea un cliente desde la página pública (sin autenticación).
 */
export const addPublicCustomer = async (data: {
  slug: string;
  name: string;
  email: string;
  phone?: string;
}) => {
  const business = await prisma.business.findUnique({
    where: { slug: data.slug },
  });
  if (!business) throw new Error('Negocio no encontrado');

  const customer = await prisma.customer.create({
    data: {
      name: data.name,
      email: data.email,
      phone: data.phone ?? null,
      businessId: business.id,
    },
  });

  return customer;
};
