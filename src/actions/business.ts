'use server';

import prisma from '@/lib/db';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
// resolveShortUrl convierte enlaces cortos (goo.gl) en la
// URL real de Google Maps antes de guardarla en la base de
// datos. Así la URL guardada es siempre la completa.
import { resolveShortUrl } from '@/lib/google-places';
import { getPlan, canCreateBusiness } from '@/lib/subscription';

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
  const { allowed, count, limit } = await canCreateBusiness(userId);
  if (!allowed) {
    throw new Error(`Has alcanzado el límite de ${limit} negocio(s) de tu plan. Mejora a Pro en /pricing`);
  }

  // Antes de guardar, resolvemos los enlaces cortos de
  // Google (goo.gl) a su URL completa. Así la base de
  // datos siempre tiene la URL definitiva y no perdemos
  // información si el servicio de acortamiento deja de
  // funcionar.
  const slug = await generateSlug(data.name);
  const googleLink = data.googleLink ? await resolveShortUrl(data.googleLink) : null;

  const business = await prisma.business.create({
    data: {
      name: data.name,
      slug,
      googleLink,
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

// Genera un código de descuento único de 8 caracteres
// (ej: REVLY-A3X9). Se usa para identificar a cada
// cliente y canjear su descuento en el negocio.
function generateDiscountCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'REVLY-';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/**
 * Crea o actualiza un cliente desde la página pública.
 * - Si el email ya existe para este negocio → suma 1 punto
 * - Si es nuevo → crea con 1 punto + código de descuento
 * Valida consent antes de guardar.
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

  // Usamos upsert para que si el cliente ya existe
  // (mismo email + mismo negocio), solo sume puntos
  // en vez de crear un duplicado.
  const customer = await prisma.customer.upsert({
    where: {
      email_businessId: { email: data.email, businessId: business.id },
    },
    create: {
      name: data.name || null,
      email: data.email,
      phone: data.phone,
      source: 'qr',
      businessId: business.id,
      points: 1,
      discountCode: generateDiscountCode(),
    },
    update: {
      name: data.name || null,
      phone: data.phone || '',
      points: { increment: 1 },
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
    invoiceFormat?: string;
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

  // Al guardar los cambios, también resolvemos posibles
  // enlaces cortos a su URL completa (igual que al crear).
  const googleLink = data.googleLink ? await resolveShortUrl(data.googleLink) : null;

  return prisma.business.update({
    where: { id },
    data: {
      name: data.name,
      googleLink,
      slug: data.slug || null,
      emailTemplate: data.emailTemplate || null,
      invoiceFormat: data.invoiceFormat || null,
    },
  });
};

// ──────────────────────────────────────────────
// deleteBusiness (Server Action)
// ──────────────────────────────────────────────
// Elimina un negocio y todos sus clientes
// asociados (CASCADE en BD). Solo el propietario
// puede eliminar su negocio.
// ──────────────────────────────────────────────
export const deleteBusiness = async (id: string) => {
  const userId = await getUserId();
  if (!userId) throw new Error('No autenticado');

  const business = await prisma.business.findFirst({
    where: { id, userId },
  });
  if (!business) throw new Error('Negocio no encontrado');

  await prisma.business.delete({ where: { id } });
};

// ──────────────────────────────────────────────
// uploadBusinessImage (Server Action)
// ──────────────────────────────────────────────
// Sube un archivo de imagen como logo del negocio
// al bucket "business-logos" en Supabase Storage.
//
// Flujo:
//   1. Verifica autenticación y propiedad del negocio.
//   2. Valida tipo (PNG/JPEG/WebP) y tamaño (≤5MB).
//   3. Sube el archivo a Supabase Storage con la ruta
//      "{businessId}/{timestamp}.{ext}".
//   4. Obtiene la URL pública del archivo subido.
//   5. Actualiza el campo Business.image en BD con esa URL.
//   6. Devuelve la URL pública.
//
// Requiere SUPABASE_SERVICE_ROLE_KEY en .env.local
// (configurada en Vercel Production).
// ──────────────────────────────────────────────
export const uploadBusinessImage = async (businessId: string, formData: FormData) => {
  const userId = await getUserId();
  if (!userId) throw new Error('No autenticado');

  const business = await prisma.business.findFirst({
    where: { id: businessId, userId },
  });
  if (!business) throw new Error('Negocio no encontrado');

  const file = formData.get('file') as File | null;
  if (!file) throw new Error('No se recibió ningún archivo');

  const allowed = ['image/png', 'image/jpeg', 'image/webp'];
  if (!allowed.includes(file.type)) {
    throw new Error('Formato no permitido. Usa PNG, JPEG o WebP');
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error('El archivo no puede superar los 5MB');
  }

  const ext = file.type.split('/')[1];
  const fileName = `${businessId}/${Date.now()}.${ext}`;

  const supabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { error: uploadError } = await supabase.storage
    .from('business-logos')
    .upload(fileName, file, { upsert: true });

  if (uploadError) throw new Error(`Error al subir: ${uploadError.message}`);

  const { data: urlData } = supabase.storage
    .from('business-logos')
    .getPublicUrl(fileName);

  const imageUrl = urlData.publicUrl;

  await prisma.business.update({
    where: { id: businessId },
    data: { image: imageUrl },
  });

  return imageUrl;
};

export const getUserFeatures = async (): Promise<string[]> => {
  const userId = await getUserId();
  if (!userId) return [];
  const plan = await getPlan(userId);
  return [...plan.features];
};
