'use server';

import prisma from '@/lib/db';

// Canjea una factura desde el perfil del cliente: comprueba que pertenezca
// al negocio, la registra y suma un punto.
export const claimInvoice = async (
  customerId: string,
  slug: string,
  invoiceNumber: string,
) => {
  const normalizedNumber = invoiceNumber.trim();
  if (!normalizedNumber) throw new Error('Número de factura requerido');
  if (normalizedNumber.length < 3) {
    throw new Error('El número de factura es demasiado corto');
  }

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: { business: { select: { slug: true, id: true } } },
  });

  if (!customer || customer.business.slug !== slug) {
    throw new Error('Cliente no encontrado');
  }

  // Cada número de factura solo puede registrarse una vez por negocio.
  const alreadyClaimed = await prisma.invoice.findUnique({
    where: {
      number_businessId: {
        number: normalizedNumber,
        businessId: customer.business.id,
      },
    },
  });
  if (alreadyClaimed) {
    throw new Error('Este número de factura ya ha sido registrado');
  }

  // Registramos la factura y sumamos el punto en una sola transacción.
  await prisma.$transaction([
    prisma.invoice.create({
      data: {
        number: normalizedNumber,
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

// Devuelve las últimas facturas canjeadas por un cliente.
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

  return invoices.map((invoice) => ({
    number: invoice.number,
    usedAt: invoice.usedAt?.toISOString() ?? null,
  }));
};
