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

// ──────────────────────────────────────────────
// deleteCustomer
// ──────────────────────────────────────────────
// Elimina un cliente individual. Solo el dueño
// del negocio puede eliminar sus clientes.
// ──────────────────────────────────────────────
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

// ──────────────────────────────────────────────
// clearCustomers
// ──────────────────────────────────────────────
// Elimina TODOS los clientes de un negocio.
// Útil para pruebas o reinicio de datos.
// Solo el dueño del negocio puede hacerlo.
// ──────────────────────────────────────────────
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

// ──────────────────────────────────────────────
// clearCompletedCustomers
// ──────────────────────────────────────────────
// Elimina solo los clientes con estado
// "completed". Se usa para limpiar clientes
// que ya dejaron reseña. Devuelve cuántos
// se eliminaron.
// ──────────────────────────────────────────────
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

// ──────────────────────────────────────────────
// findPublicCustomerByEmail
// ──────────────────────────────────────────────
// Busca un cliente por email en un negocio (slug).
// Devuelve el cliente si existe o null si no.
// Es una Server Action pública — no requiere auth.
// Sirve para el flujo: "¿Ya tienes cuenta?
// Introduce tu email" en la página pública.
// Cuando el QR del negocio escanea y el cliente
// introduce su email, esta función lo busca y
// redirige directamente a su perfil de puntos
// si ya existe (evita que tenga que registrarse
// cada vez que visita el negocio).
// ──────────────────────────────────────────────
export const findPublicCustomerByEmail = async (
  slug: string,
  email: string,
) => {
  const business = await prisma.business.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!business) return null;

  const customer = await prisma.customer.findUnique({
    where: {
      email_businessId: { email, businessId: business.id },
    },
    include: {
      business: { select: { name: true, slug: true } },
    },
  });

  if (!customer) return null;

  return {
    id: customer.id,
    name: customer.name,
    points: customer.points,
    discountCode: customer.discountCode,
    businessName: customer.business.name,
  };
};

// ──────────────────────────────────────────────
// getPublicCustomer
// ──────────────────────────────────────────────
// Devuelve los datos que necesita la página de perfil
// del cliente (puntos, código de descuento, negocio).
// No requiere autenticación porque es una página pública.
// Busca el cliente por ID y verifica que el slug del
// negocio coincida (para evitar mostrar datos de otro).
//
// También devuelve invoiceFormat — el formato de factura
// que el negocio configuró, para mostrarlo como placeholder
// en el campo de canje de factura del cliente.
// ──────────────────────────────────────────────
export const getPublicCustomer = async (
  customerId: string,
  slug: string,
) => {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: {
      business: { select: { name: true, slug: true, invoiceFormat: true } },
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
    invoiceFormat: customer.business.invoiceFormat,
  };
};

// ──────────────────────────────────────────────
// deleteSelectedCustomers
// ──────────────────────────────────────────────
// Elimina múltiples clientes seleccionados de la tabla.
// Primero verifica que TODOS pertenezcan al usuario
// (en una sola query findMany filtrada por userId del
// negocio). Solo borra los IDs válidos para evitar
// que alguien intente borrar clientes de otros negocios.
// ──────────────────────────────────────────────
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
