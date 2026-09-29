"use server";

import prisma from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { generateQrToken } from "@/lib/qr-token";
import { POINTS_PER_REDEMPTION, POINTS_CAP, DISCOUNT_PERCENT, todayKey } from "@/lib/loyalty";

// Devuelve el id del usuario autenticado o lanza si no hay sesión.
async function requireUserId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  return user.id;
}

// Genera un token de QR único (reintenta en el improbable caso de colisión).
async function generateUniqueQrToken(): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const token = generateQrToken();
    const existing = await prisma.customer.findUnique({
      where: { qrToken: token },
      select: { id: true },
    });
    if (!existing) return token;
  }
  return generateQrToken();
}

// Comprueba que el negocio exista y pertenezca al usuario indicado.
async function requireOwnedBusiness(businessId: string, userId: string) {
  const business = await prisma.business.findFirst({
    where: { id: businessId, userId },
  });
  if (!business) throw new Error("Negocio no encontrado");
  return business;
}

// Crea un cliente manualmente desde el dashboard.
export const addCustomer = async (data: {
  businessId: string;
  name: string;
  email: string;
  phone: string;
}) => {
  const userId = await requireUserId();
  await requireOwnedBusiness(data.businessId, userId);

  const qrToken = await generateUniqueQrToken();

  return prisma.$transaction(async (tx) => {
    const created = await tx.customer.create({
      data: {
        name: data.name || null,
        email: data.email,
        phone: data.phone,
        businessId: data.businessId,
        qrToken,
      },
    });
    // Punto de bienvenida registrado en el historial.
    await tx.pointMovement.create({
      data: {
        type: "welcome",
        points: 1,
        day: null,
        businessId: data.businessId,
        customerId: created.id,
      },
    });
    return created;
  });
};

// Devuelve los clientes de un negocio, del más reciente al más antiguo.
export const getCustomers = async (businessId: string) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  return prisma.customer.findMany({
    where: { businessId, business: { userId: user.id } },
    orderBy: { createdAt: "desc" },
  });
};

// Cambia el estado de un cliente (pending → invited → completed).
export const updateCustomerStatus = async (
  customerId: string,
  status: string,
) => {
  await requireUserId();

  return prisma.customer.update({
    where: { id: customerId },
    data: { status },
  });
};

// Crea o actualiza varios clientes a la vez (importación CSV o manual).
// Si el email ya existe en el negocio, actualiza nombre y teléfono.
export const addCustomerBatch = async (
  businessId: string,
  customers: { name?: string; email: string; phone: string }[],
) => {
  const userId = await requireUserId();
  await requireOwnedBusiness(businessId, userId);

  let created = 0;
  let failed = 0;

  for (const { name, email, phone } of customers) {
    try {
      const existing = await prisma.customer.findUnique({
        where: { email_businessId: { email, businessId } },
        select: { id: true },
      });

      if (existing) {
        await prisma.customer.update({
          where: { id: existing.id },
          data: { name: name || null, phone },
        });
      } else {
        const qrToken = await generateUniqueQrToken();
        await prisma.$transaction(async (tx) => {
          const created = await tx.customer.create({
            data: {
              name: name || null,
              email,
              phone,
              businessId,
              source: "manual",
              qrToken,
            },
          });
          // Punto de bienvenida registrado en el historial.
          await tx.pointMovement.create({
            data: {
              type: "welcome",
              points: 1,
              day: null,
              businessId,
              customerId: created.id,
            },
          });
        });
      }
      created++;
    } catch (error) {
      console.error("Error procesando cliente:", error);
      failed++;
    }
  }

  return { created, errors: failed };
};

// Elimina un cliente. Solo el dueño del negocio puede.
export const deleteCustomer = async (customerId: string) => {
  const userId = await requireUserId();

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, business: { userId } },
  });
  if (!customer) throw new Error("Cliente no encontrado");

  await prisma.customer.delete({ where: { id: customerId } });
  return { success: true };
};

// Elimina todos los clientes de un negocio.
export const clearCustomers = async (businessId: string) => {
  const userId = await requireUserId();
  await requireOwnedBusiness(businessId, userId);

  await prisma.customer.deleteMany({ where: { businessId } });
  return { success: true };
};

// Elimina solo los clientes que ya completaron (dejaron reseña).
export const clearCompletedCustomers = async (businessId: string) => {
  const userId = await requireUserId();
  await requireOwnedBusiness(businessId, userId);

  const { count } = await prisma.customer.deleteMany({
    where: { businessId, status: "completed" },
  });
  return { count };
};

// Pública: busca un cliente por email dentro de un negocio.
// Se usa en la página pública para saber si el cliente ya existe.
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
    where: { email_businessId: { email, businessId: business.id } },
    include: { business: { select: { name: true, slug: true } } },
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

// Pública: datos del perfil de un cliente (puntos, código y negocio).
// Verifica que el slug coincida para no mostrar datos de otro negocio.
export const getPublicCustomer = async (customerId: string, slug: string) => {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: {
      business: { select: { name: true, slug: true, ticketFormat: true } },
    },
  });
  if (!customer || customer.business.slug !== slug) return null;

  // Si el cliente aún no tiene token de QR (clientes antiguos),
  // lo generamos ahora para que su QR personal funcione.
  let qrToken = customer.qrToken;
  if (!qrToken) {
    qrToken = await generateUniqueQrToken();
    await prisma.customer.update({
      where: { id: customer.id },
      data: { qrToken },
    });
  }

  return {
    id: customer.id,
    name: customer.name,
    points: customer.points,
    discountCode: customer.discountCode,
    businessName: customer.business.name,
    ticketFormat: customer.business.ticketFormat,
    qrToken,
  };
};

// Elimina varios clientes seleccionados, solo los que sean del usuario.
export const deleteSelectedCustomers = async (ids: string[]) => {
  const userId = await requireUserId();

  const ownedCustomers = await prisma.customer.findMany({
    where: { id: { in: ids }, business: { userId } },
    select: { id: true },
  });
  const ownedIds = ownedCustomers.map((customer) => customer.id);

  await prisma.customer.deleteMany({ where: { id: { in: ownedIds } } });
  return { deleted: ownedIds.length };
};

// Identifica a un cliente a partir del token de su QR personal
// (escaneado por el empleado en caja). Solo funciona si el cliente
// pertenece a un negocio del usuario autenticado: un QR de otro
// negocio simplemente no se encontrará.
export const scanCustomerToken = async (token: string, businessId: string) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false as const, error: "No autenticado" };
  }

  const normalized = token.trim();
  if (!normalized) {
    return { success: false as const, error: "QR vacío" };
  }

  const business = await prisma.business.findFirst({
    where: { id: businessId, userId: user.id },
    select: { id: true, loyaltyEnabled: true, name: true },
  });
  if (!business) {
    return { success: false as const, error: "Negocio no encontrado" };
  }
  if (!business.loyaltyEnabled) {
    return {
      success: false as const,
      error: "El programa de puntos no está activo",
    };
  }

  const customer = await prisma.customer.findFirst({
    where: { qrToken: normalized, businessId: business.id },
    select: { id: true, name: true, points: true, discountCode: true },
  });
  if (!customer) {
    return {
      success: false as const,
      error: "Cliente no encontrado para este negocio",
    };
  }

  const alreadyEarnedToday = await prisma.pointMovement.findFirst({
    where: {
      customerId: customer.id,
      businessId: business.id,
      type: "earn",
      day: todayKey(),
    },
  });

  return {
    success: true as const,
    customer: {
      id: customer.id,
      name: customer.name,
      points: customer.points,
      discountCode: customer.discountCode,
      canEarnToday: !alreadyEarnedToday,
      rewardAvailable: customer.points >= POINTS_PER_REDEMPTION,
      pointsPerRedemption: POINTS_PER_REDEMPTION,
      pointsCap: POINTS_CAP,
      discountPercent: DISCOUNT_PERCENT,
    },
  };
};
