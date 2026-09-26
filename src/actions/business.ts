'use server';

import prisma from '@/lib/db';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { resolveShortUrl } from '@/lib/google-places';
import { getPlan, canCreateBusiness } from '@/lib/subscription';
import { generateDiscountCode } from '@/lib/discount-code';
import {
  notifyCustomerRegistered,
  scheduleReviewRequest,
} from '@/lib/notifications';

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

// Devuelve todos los negocios del usuario, con el recuento de clientes.
export const getBusinesses = async () => {
  const userId = await getUserId();
  if (!userId) return [];

  return prisma.business.findMany({
    where: { userId },
    include: { _count: { select: { customers: true } } },
  });
};

// Busca un negocio por su slug (página pública, sin autenticación).
export const getBusinessBySlug = async (slug: string) => {
  return prisma.business.findUnique({ where: { slug } });
};

// Crea un cliente desde la página pública con 1 punto de bienvenida.
// Si el email ya existe para este negocio, solo actualiza sus datos
// (no vuelve a sumar puntos; para eso está el ticket del kiosko).
export const addPublicCustomer = async (data: {
  slug: string;
  name: string;
  email: string;
  phone: string;
  consent: boolean;
  whatsappOptIn?: boolean;
}) => {
  if (!data.consent) {
    throw new Error('Debes aceptar la política de privacidad');
  }

  const business = await prisma.business.findUnique({
    where: { slug: data.slug },
  });
  if (!business) throw new Error('Negocio no encontrado');

  // Si el cliente ya existe, solo actualizamos sus datos (sin volver a dar puntos).
  const existingCustomer = await prisma.customer.findUnique({
    where: {
      email_businessId: { email: data.email, businessId: business.id },
    },
  });
  if (existingCustomer) {
    return prisma.customer.update({
      where: { id: existingCustomer.id },
      data: {
        name: data.name || null,
        phone: data.phone || '',
        whatsappOptIn: data.whatsappOptIn ?? false,
      },
    });
  }

  const customer = await prisma.customer.create({
    data: {
      name: data.name || null,
      email: data.email,
      phone: data.phone,
      whatsappOptIn: data.whatsappOptIn ?? false,
      source: 'qr',
      businessId: business.id,
      points: 1,
      discountCode: generateDiscountCode(),
    },
  });

  // Aviso de bienvenida por email + WhatsApp (si están configurados).
  await notifyCustomerRegistered({
    name: customer.name,
    email: customer.email,
    businessName: business.name,
    points: customer.points,
    discountCode: customer.discountCode,
  });

  // Programa la petición de reseña para el día siguiente.
  await scheduleReviewRequest({
    customerId: customer.id,
    name: customer.name,
    email: customer.email,
    businessName: business.name,
    googleLink: business.googleLink,
    emailTemplate: business.emailTemplate,
  });

  return customer;
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
