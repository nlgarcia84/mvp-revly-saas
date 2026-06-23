'use server';

import prisma from '@/lib/db';

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
