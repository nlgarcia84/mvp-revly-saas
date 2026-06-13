'use server';

import prisma from '@/lib/db';
import { createClient } from '@/lib/supabase/server';

// ──────────────────────────────────────────────
// slugify
// ──────────────────────────────────────────────
// Convierte un texto en un slug URL-friendly:
// minúsculas, sin acentos, espacios → guiones.
// Ej: "Cafetería El Centro" → "cafeteria-el-centro"
// ──────────────────────────────────────────────
function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ──────────────────────────────────────────────
// generateSlug
// ──────────────────────────────────────────────
// Genera un slug único. Si el slug base ya existe
// en BD, añade un contador incremental:
// "cafeteria-el-centro", "cafeteria-el-centro-1", ...
// ──────────────────────────────────────────────
async function generateSlug(name: string): Promise<string> {
  const base = slugify(name) || 'negocio';
  let slug = base;
  let counter = 1;
  while (await prisma.business.findUnique({ where: { slug } })) {
    slug = `${base}-${counter++}`;
  }
  return slug;
}

// ──────────────────────────────────────────────
// getUserId
// ──────────────────────────────────────────────
// Obtiene el ID del usuario autenticado leyendo
// la cookie de sesión de Supabase. Devuelve string
// vacío si no hay sesión activa.
// ──────────────────────────────────────────────
async function getUserId(): Promise<string> {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id ?? '';
}

// ──────────────────────────────────────────────
// createBusiness (Server Action)
// ──────────────────────────────────────────────
// Crea un nuevo negocio para el usuario autenticado.
// Genera el slug automáticamente desde el nombre y
// valida que el usuario tenga sesión activa.
// ──────────────────────────────────────────────
export const createBusiness = async (data: {
  name: string;
  googleLink?: string;
}) => {
  const userId = await getUserId();
  if (!userId) throw new Error('No autenticado');

  // Verifica límite del plan
  const { canCreateBusiness } = await import('@/lib/subscription');
  const { allowed, count, limit } = await canCreateBusiness(userId);
  if (!allowed) {
    throw new Error(`Has alcanzado el límite de ${limit} negocio(s) de tu plan. Mejora a Pro en /pricing`);
  }

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

// ──────────────────────────────────────────────
// getBusinesses
// ──────────────────────────────────────────────
// Devuelve todos los negocios del usuario autenticado.
// Incluye el recuento de clientes (customers) para
// mostrarlo en la lista del dashboard.
// ──────────────────────────────────────────────
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
 * Se usa en la ruta /[slug] para mostrar el formulario
 * de descuento al cliente sin necesidad de autenticación.
 */
export const getBusinessBySlug = async (slug: string) => {
  return prisma.business.findUnique({
    where: { slug },
  });
};

/**
 * Crea un cliente desde la página pública (sin autenticación).
 * Valida que el usuario haya marcado consent (aceptar
 * política de privacidad) antes de guardar en BD.
 * Requiere el slug del negocio, no el ID.
 */
export const addPublicCustomer = async (data: {
  slug: string;
  name: string;
  email: string;
  phone: string;
  consent: boolean;
}) => {
  if (!data.consent) throw new Error('Debes aceptar la política de privacidad');

  const business = await prisma.business.findUnique({
    where: { slug: data.slug },
  });
  if (!business) throw new Error('Negocio no encontrado');

  const customer = await prisma.customer.create({
    data: {
      name: data.name || null,
      email: data.email,
      phone: data.phone,
      source: 'qr',
      businessId: business.id,
    },
  });

  return customer;
};

// ──────────────────────────────────────────────
// updateBusiness (Server Action)
// ──────────────────────────────────────────────
// Actualiza los datos de un negocio: nombre,
// enlace de Google, slug y plantilla de email.
// Verifica que el slug sea único (si cambió).
// ──────────────────────────────────────────────
export const updateBusiness = async (
  id: string,
  data: {
    name: string;
    googleLink: string;
    slug: string;
    emailTemplate: string;
  },
) => {
  const userId = await getUserId();
  if (!userId) throw new Error('No autenticado');

  // Verifica que el negocio pertenezca al usuario
  const existing = await prisma.business.findFirst({
    where: { id, userId },
  });
  if (!existing) throw new Error('Negocio no encontrado');

  // Si el slug cambió, verifica que sea único
  if (data.slug !== existing.slug) {
    const slugExists = await prisma.business.findUnique({
      where: { slug: data.slug },
    });
    if (slugExists) throw new Error('El slug ya está en uso');
  }

  return prisma.business.update({
    where: { id },
    data: {
      name: data.name,
      googleLink: data.googleLink || null,
      slug: data.slug || null,
      emailTemplate: data.emailTemplate || null,
    },
  });
};
