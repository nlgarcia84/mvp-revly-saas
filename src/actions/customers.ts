'use server';

import prisma from '@/lib/db';
import { createClient } from '@/lib/supabase/server';

// ──────────────────────────────────────────────
// addCustomer
// ──────────────────────────────────────────────
// Crea un cliente manualmente desde el dashboard
// (no desde la página pública). Verifica que el
// negocio pertenezca al usuario autenticado.
// ──────────────────────────────────────────────
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

// ──────────────────────────────────────────────
// getCustomers
// ──────────────────────────────────────────────
// Devuelve todos los clientes de un negocio
// ordenados del más reciente al más antiguo.
// Verifica que el negocio pertenezca al usuario.
// ──────────────────────────────────────────────
export const getCustomers = async (businessId: string) => {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id ?? '';
  if (!userId) return [];

  return prisma.customer.findMany({
    where: { businessId, business: { userId } },
    orderBy: { createdAt: 'desc' },
  });
};

// ──────────────────────────────────────────────
// updateCustomerStatus
// ──────────────────────────────────────────────
// Cambia el estado de un cliente (pending →
// invited → completed). Se usa desde la tabla
// de gestión de clientes al enviar invitaciones.
// ──────────────────────────────────────────────
export const updateCustomerStatus = async (customerId: string, status: string) => {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id ?? '';
  if (!userId) throw new Error('No autenticado');

  return prisma.customer.update({
    where: { id: customerId },
    data: { status },
  });
};

// ──────────────────────────────────────────────
// addCustomerBatch
// ──────────────────────────────────────────────
// Crea o actualiza múltiples clientes a la vez
// (desde CSV o importación manual). Si el email
// ya existe para el negocio, actualiza nombre y
// teléfono (upsert). Devuelve cuántos se
// procesaron y cuántos fallaron.
// ──────────────────────────────────────────────
export const addCustomerBatch = async (
  businessId: string,
  customers: { name?: string; email: string; phone: string }[],
) => {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id ?? '';
  if (!userId) throw new Error('No autenticado');

  const business = await prisma.business.findFirst({
    where: { id: businessId, userId },
  });
  if (!business) throw new Error('Negocio no encontrado');

  let created = 0;
  let errors = 0;

  for (const c of customers) {
    try {
      await prisma.customer.upsert({
        where: {
          email_businessId: { email: c.email, businessId },
        },
        create: {
          name: c.name || null,
          email: c.email,
          phone: c.phone,
          businessId,
          source: 'manual',
        },
        update: {
          name: c.name || null,
          phone: c.phone,
        },
      });
      created++;
    } catch (e) {
      console.error('Error procesando cliente:', e);
      errors++;
    }
  }

  return { created, errors };
};

export const deleteCustomer = async (customerId: string) => {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id ?? '';
  if (!userId) throw new Error('No autenticado');

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, business: { userId } },
  });
  if (!customer) throw new Error('Cliente no encontrado');

  await prisma.customer.delete({ where: { id: customerId } });
  return { success: true };
};

export const clearCustomers = async (businessId: string) => {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id ?? '';
  if (!userId) throw new Error('No autenticado');

  const business = await prisma.business.findFirst({
    where: { id: businessId, userId },
  });
  if (!business) throw new Error('Negocio no encontrado');

  await prisma.customer.deleteMany({ where: { businessId } });
  return { success: true };
};

export const clearCompletedCustomers = async (businessId: string) => {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id ?? '';
  if (!userId) throw new Error('No autenticado');

  const business = await prisma.business.findFirst({
    where: { id: businessId, userId },
  });
  if (!business) throw new Error('Negocio no encontrado');

  const { count } = await prisma.customer.deleteMany({
    where: { businessId, status: 'completed' },
  });
  return { count };
};

// ─── Página pública del cliente ──────────────────────
// Devuelve los datos que necesita la página de perfil
// del cliente (puntos, código de descuento, negocio).
// No requiere autenticación porque es una página pública.
// Busca el cliente por ID y verifica que el slug del
// negocio coincida (para evitar mostrar datos de otro).
// ─────────────────────────────────────────────────────
export const getPublicCustomer = async (
  customerId: string,
  slug: string,
) => {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: {
      business: { select: { name: true, slug: true } },
    },
  });

  if (!customer) return null;
  if (customer.business.slug !== slug) return null;

  return {
    id: customer.id,
    name: customer.name,
    points: customer.points,
    discountCode: customer.discountCode,
    businessName: customer.business.name,
  };
};

export const deleteSelectedCustomers = async (ids: string[]) => {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id ?? '';
  if (!userId) throw new Error('No autenticado');

  const customers = await prisma.customer.findMany({
    where: { id: { in: ids }, business: { userId } },
    select: { id: true },
  });
  const validIds = customers.map((c) => c.id);

  await prisma.customer.deleteMany({ where: { id: { in: validIds } } });
  return { deleted: validIds.length };
};
