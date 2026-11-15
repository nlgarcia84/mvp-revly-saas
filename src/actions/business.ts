'use server';

import prisma from '@/lib/db';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { resolveShortUrl } from '@/lib/google-places';
import { getPlan, canCreateBusiness } from '@/lib/subscription';
import { requestEmailChallenge } from '@/lib/public-customer-access';

// Convierte un texto en un slug URL-friendly: minúsculas, sin acentos y
// espacios convertidos en guiones. "Cafetería El Centro" → "cafeteria-el-centro".
function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Genera un slug único; si ya existe, añade un contador incremental.
async function generateSlug(name: string): Promise<string> {
  const baseSlug = slugify(name) || 'negocio';
  let candidateSlug = baseSlug;
  let counter = 1;
  while (await prisma.business.findUnique({ where: { slug: candidateSlug } })) {
    candidateSlug = `${baseSlug}-${counter++}`;
  }
  return candidateSlug;
}

// Id del usuario autenticado (o cadena vacía si no hay sesión).
async function getUserId(): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? '';
}

// Crea un negocio para el usuario autenticado, generando su slug.
export const createBusiness = async (data: {
  name: string;
  googleLink?: string;
}) => {
  const userId = await getUserId();
  if (!userId) throw new Error('No autenticado');

  const { allowed, limit } = await canCreateBusiness(userId);
  if (!allowed) {
    throw new Error(
      `Has alcanzado el límite de ${limit} negocio(s) de tu plan. Mejora a Pro en /pricing`,
    );
  }

  const slug = await generateSlug(data.name);
  // Guardamos siempre la URL completa (resolvemos enlaces cortos de Google).
  const googleLink = data.googleLink
    ? await resolveShortUrl(data.googleLink)
    : null;

  return prisma.business.create({
    data: { name: data.name, slug, googleLink, userId },
  });
};

// ── Campos seguros para el cliente ──────────────────────
// La tabla Business guarda tokens de OAuth (Google, Instagram, Facebook)
// y cachés JSON que NUNCA deben salir del servidor. Cualquier acción
// que devuelva un negocio a un componente "use client" debe usar este
// select explícito en lugar de findMany/findUnique sin select.
// ─────────────────────────────────────────────────────────
const businessPublicSelect = {
  id: true,
  name: true,
  slug: true,
  image: true,
  googleLink: true,
  loyaltyEnabled: true,
  address: true,
  latitude: true,
  longitude: true,
  openingHours: true,
  photos: true,
  reservationConfig: true,
  createdAt: true,
} as const;

// Devuelve todos los negocios del usuario, con el recuento de clientes.
export const getBusinesses = async () => {
  const userId = await getUserId();
  if (!userId) return [];

  return prisma.business.findMany({
    where: { userId },
    select: { ...businessPublicSelect, _count: { select: { customers: true } } },
  });
};

// Devuelve un solo negocio con los campos seguros para el dashboard.
// Se usa en el layout de /business/[id] para no repetir el select.
export const getBusinessForDashboard = async (id: string) => {
  const userId = await getUserId();
  if (!userId) return null;

  return prisma.business.findFirst({
    where: { id, userId },
    select: {
      ...businessPublicSelect,
      _count: { select: { customers: true } },
    },
  });
};

// Carga el estado compartido del dashboard con una sola comprobación de
// sesión. Las features siguen calculándose en servidor y el negocio mantiene
// el filtro por userId, por lo que el cliente no puede elegir otro negocio ni
// otro plan.
export const getDashboardBusinessData = async (id: string) => {
  const userId = await getUserId();
  if (!userId) return { business: null, features: [] as string[] };

  const [business, plan] = await Promise.all([
    prisma.business.findFirst({
      where: { id, userId },
      select: {
        ...businessPublicSelect,
        _count: { select: { customers: true } },
      },
    }),
    getPlan(userId),
  ]);

  return { business, features: [...plan.features] };
};

// Busca un negocio por su slug (página pública, sin autenticación).
export const getBusinessBySlug = async (slug: string) => {
  return prisma.business.findUnique({ where: { slug }, select: businessPublicSelect });
};

// Solicita un registro público: el punto de bienvenida se concede después del OTP.
// La solicitud no crea ni modifica clientes; los datos se aplican al verificar el email.
export const addPublicCustomer = async (data: {
  slug: string;
  name: string;
  email: string;
  phone: string;
  consent: boolean;
  whatsappOptIn?: boolean;
}) => {
  if (!data || data.consent !== true || typeof data.name !== 'string' || data.name.trim().length < 1 || data.name.length > 100 ||
      typeof data.phone !== 'string' || data.phone.length > 30 ||
      (data.whatsappOptIn !== undefined && typeof data.whatsappOptIn !== 'boolean')) {
    return { success: false as const, error: 'Revisa tus datos y acepta la política de privacidad.' };
  }
  try {
    return await requestEmailChallenge(data.slug, data.email, { name: data.name.trim(), phone: data.phone.trim(), whatsappOptIn: data.whatsappOptIn ?? false });
  } catch {
    return { success: false as const, error: 'No se pudo tramitar la solicitud. Inténtalo más tarde.' };
  }
};

// Actualiza los datos de un negocio (solo el dueño).
export const updateBusiness = async (
  id: string,
  data: {
    name: string;
    googleLink: string;
    slug: string;
    emailTemplate: string;
    ticketFormat?: string;
  },
) => {
  const userId = await getUserId();
  if (!userId) throw new Error('No autenticado');

  const existingBusiness = await prisma.business.findFirst({
    where: { id, userId },
  });
  if (!existingBusiness) throw new Error('Negocio no encontrado');

  // Si el slug cambió, comprobamos que el nuevo no esté en uso.
  if (data.slug !== existingBusiness.slug) {
    const businessWithSlug = await prisma.business.findUnique({
      where: { slug: data.slug },
    });
    if (businessWithSlug) throw new Error('El slug ya está en uso');
  }

  const googleLink = data.googleLink
    ? await resolveShortUrl(data.googleLink)
    : null;

  return prisma.business.update({
    where: { id },
    data: {
      name: data.name,
      googleLink,
      slug: data.slug || null,
      emailTemplate: data.emailTemplate || null,
      ticketFormat: data.ticketFormat || null,
    },
  });
};

// Elimina un negocio y, en cascada, sus clientes. Solo el dueño.
export const deleteBusiness = async (id: string) => {
  const userId = await getUserId();
  if (!userId) throw new Error('No autenticado');

  const business = await prisma.business.findFirst({
    where: { id, userId },
  });
  if (!business) throw new Error('Negocio no encontrado');

  await prisma.business.delete({ where: { id } });
};

// Sube el logo del negocio a Supabase Storage y guarda su URL pública.
export const uploadBusinessImage = async (
  businessId: string,
  formData: FormData,
) => {
  const userId = await getUserId();
  if (!userId) throw new Error('No autenticado');

  const business = await prisma.business.findFirst({
    where: { id: businessId, userId },
  });
  if (!business) throw new Error('Negocio no encontrado');

  const file = formData.get('file') as File | null;
  if (!file) throw new Error('No se recibió ningún archivo');

  const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Formato no permitido. Usa PNG, JPEG o WebP');
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('El archivo no puede superar los 5MB');
  }

  const fileExtension = file.type.split('/')[1];
  const filePath = `${businessId}/${Date.now()}.${fileExtension}`;

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { error: uploadError } = await supabaseAdmin.storage
    .from('business-logos')
    .upload(filePath, file, { upsert: true });
  if (uploadError) throw new Error(`Error al subir: ${uploadError.message}`);

  const { data: publicUrlData } = supabaseAdmin.storage
    .from('business-logos')
    .getPublicUrl(filePath);
  const publicImageUrl = publicUrlData.publicUrl;

  await prisma.business.update({
    where: { id: businessId },
    data: { image: publicImageUrl },
  });

  return publicImageUrl;
};

// Devuelve las funcionalidades disponibles según el plan del usuario.
export const getUserFeatures = async (): Promise<string[]> => {
  const userId = await getUserId();
  if (!userId) return [];
  const plan = await getPlan(userId);
  return [...plan.features];
};
