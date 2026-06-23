'use server';

import prisma from '@/lib/db';
import { createClient } from '@/lib/supabase/server';

export const addInvoices = async (businessId: string, numbers: string[]) => {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id ?? '';
  if (!userId) throw new Error('No autenticado');

  const business = await prisma.business.findFirst({
    where: { id: businessId, userId },
  });
  if (!business) throw new Error('Negocio no encontrado');

  const cleanNumbers = [...new Set(numbers.map((n) => n.trim()).filter(Boolean))];

  const created = await prisma.invoice.createMany({
    data: cleanNumbers.map((number) => ({
      number,
      businessId,
    })),
    skipDuplicates: true,
  });

  return { added: created.count, total: cleanNumbers.length };
};

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
