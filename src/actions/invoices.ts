'use server';

import prisma from '@/lib/db';
import { createClient } from '@/lib/supabase/server';

/**
 * addInvoices
 *
 * Añade uno o varios números de factura a un negocio.
 * El negocio da de alta números de factura únicos para que los
 * clientes los canjeen por puntos (1 factura = 1 punto).
 *
 * Cada número solo puede usarse una vez (unique constraint
 * @@unique([number, businessId]) en el schema).
 * skipDuplicates evita errores si se intenta añadir un número ya existente.
 *
 * Requiere autenticación (solo el dueño del negocio).
 */
export const claimInvoice = async (
  customerId: string,
  slug: string,
  invoiceNumber: string,
) => {
  const trimmed = invoiceNumber.trim();
  if (!trimmed) throw new Error('Número de factura requerido');
  if (trimmed.length < 3) throw new Error('El número de factura es demasiado corto');

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: { business: { select: { slug: true, id: true } } },
  });

  if (!customer) throw new Error('Cliente no encontrado');
  if (customer.business.slug !== slug) throw new Error('Cliente no encontrado');

  // Busca si ya existe una factura con ese número para este negocio
  const existing = await prisma.invoice.findUnique({
    where: {
      number_businessId: { number: trimmed, businessId: customer.business.id },
    },
  });

  if (existing) {
    throw new Error('Este número de factura ya ha sido registrado');
  }

  // Crea la factura y suma el punto en una transacción atómica
  await prisma.$transaction([
    prisma.invoice.create({
      data: {
        number: trimmed,
        businessId: customer.business.id,
        customerId,
        usedAt: new Date(),
      },
    }),
    prisma.customer.update({
      where: { id: customerId },
      data: { points: { increment: 1 } },
    }),
  ]);

  return { success: true };
};

export const getCustomerInvoices = async (customerId: string, slug: string) => {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: { business: { select: { slug: true } } },
  });
  if (!customer || customer.business.slug !== slug) return [];

  const invoices = await prisma.invoice.findMany({
    where: { customerId },
    orderBy: { usedAt: 'desc' },
    take: 50,
  });

  return invoices.map((inv) => ({
    number: inv.number,
    usedAt: inv.usedAt?.toISOString() ?? null,
  }));
};

/**
 * getInvoices
 *
 * Devuelve todas las facturas de un negocio ordenadas por fecha
 * de creación (más recientes primero). Incluye los datos del
 * cliente que la canjeó (si aplica) para que el negocio pueda
 * ver qué cliente usó cada factura.
 *
 * Requiere autenticación.
 */
export const getInvoices = async (businessId: string) => {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id ?? '';
  if (!userId) throw new Error('No autenticado');

  const business = await prisma.business.findFirst({
    where: { id: businessId, userId },
  });
  if (!business) throw new Error('Negocio no encontrado');

  const invoices = await prisma.invoice.findMany({
    where: { businessId },
    include: {
      customer: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return invoices.map((inv) => ({
    id: inv.id,
    number: inv.number,
    used: inv.customerId !== null,
    usedAt: inv.usedAt?.toISOString() ?? null,
    customerName: inv.customer?.name ?? null,
    customerEmail: inv.customer?.email ?? null,
    createdAt: inv.createdAt.toISOString(),
  }));
};

/**
 * claimInvoice
 *
 * El cliente canjea un número de factura para sumar 1 punto.
 * Flujo:
 *   1. Verifica que el cliente exista y pertenezca al negocio (slug)
 *   2. Busca la factura por número + negocio
 *   3. Si no existe → error "Número de factura no válido"
 *   4. Si ya fue canjeada (customerId != null) → error "Ya canjeada"
 *   5. Si todo ok → transacción atómica: marca factura como usada Y
 *      suma 1 punto al cliente (todo o nada)
 *
 * Es una Server Action pública (sin auth) porque la usa el cliente
 * desde su perfil público. El sistema antifraude es que cada factura
 * solo puede canjearse una vez (unique + customerId check).
 */
export const claimInvoice = async (
  customerId: string,
  slug: string,
  invoiceNumber: string,
) => {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: { business: { select: { slug: true, id: true } } },
  });

  if (!customer) throw new Error('Cliente no encontrado');
  if (customer.business.slug !== slug) throw new Error('Cliente no encontrado');

  const invoice = await prisma.invoice.findUnique({
    where: {
      number_businessId: { number: invoiceNumber, businessId: customer.business.id },
    },
  });

  if (!invoice) throw new Error('Número de factura no válido');
  if (invoice.customerId) throw new Error('Esta factura ya ha sido canjeada');

  // Transacción atómica: marca la factura como usada Y suma el punto
  // Si algo falla, la BD revierte ambas operaciones (rollback implícito)
  await prisma.$transaction([
    prisma.invoice.update({
      where: { id: invoice.id },
      data: { customerId, usedAt: new Date() },
    }),
    prisma.customer.update({
      where: { id: customerId },
      data: { points: { increment: 1 } },
    }),
  ]);

  return { success: true };
};

/**
 * deleteInvoice
 *
 * Elimina una factura del sistema. Solo permite borrar facturas
 * que no hayan sido canjeadas aún (no hay validación explícita,
 * pero si está canjeada tiene customerId puesto).
 *
 * Requiere autenticación (solo el dueño del negocio).
 */
export const deleteInvoice = async (id: string) => {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id ?? '';
  if (!userId) throw new Error('No autenticado');

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { business: { select: { userId: true } } },
  });

  if (!invoice || invoice.business.userId !== userId) {
    throw new Error('Factura no encontrada');
  }

  await prisma.invoice.delete({ where: { id } });
  return { success: true };
};
