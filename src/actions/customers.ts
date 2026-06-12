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
// Crea múltiples clientes a la vez (desde CSV o
// importación manual). Omite los que ya existen
// (duplicados por email + businessId). Devuelve
// cuántos se crearon y cuántos se omitieron.
// ──────────────────────────────────────────────
export const addCustomerBatch = async (
  businessId: string,
  customers: { name?: string; email: string; phone: string }[],
) => {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id ?? '';
  if (!userId) throw new Error('No autenticado');

  // Verifica que el negocio pertenezca al usuario
  const business = await prisma.business.findFirst({
    where: { id: businessId, userId },
  });
  if (!business) throw new Error('Negocio no encontrado');

  let created = 0;
  let skipped = 0;

  for (const c of customers) {
    try {
      await prisma.customer.create({
        data: {
          name: c.name || null,
          email: c.email,
          phone: c.phone,
          businessId,
          source: 'manual',
        },
      });
      created++;
    } catch {
      // Error por unique constraint (email + businessId)
      skipped++;
    }
  }

  return { created, skipped };
};
