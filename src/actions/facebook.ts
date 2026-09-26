'use server';

import prisma from '@/lib/db';
import { createClient } from '@/lib/supabase/server';
import {
  getFacebookCommentsData,
  getUserFacebookPages,
  isFacebookTokenExpired,
  postFacebookCommentReply,
  publishPagePhotoPost,
  publishPageTextPost,
  subscribePageToWebhooks,
  type FacebookPost,
} from '@/lib/facebook-graph';

// La caché evita llamar a la Graph API de Facebook en cada
// apertura del dashboard (rate-limit y riesgo de que Meta
// marque la app por uso automatizado).
const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutos

// Tiempo máximo para elegir página tras el OAuth. Pasado
// ese plazo hay que volver a conectar con Facebook.
const PENDING_TTL_MS = 15 * 60 * 1000; // 15 minutos

// Páginas guardadas temporalmente mientras el usuario elige
// cuál conectar (cuando administra más de una).
type FacebookPending = {
  token: string;
  expiry: string;
  at: string;
  pages: { id: string; name: string; username: string | null }[];
};

function readPendingPages(
  pending: unknown,
): { id: string; name: string; username: string | null }[] {
  const data = pending as FacebookPending | null;
  if (!data?.pages?.length) return [];
  if (Date.now() - new Date(data.at).getTime() > PENDING_TTL_MS) return [];
  return data.pages;
}

type FacebookData = {
  pageName: string;
  username: string;
  posts: FacebookPost[];
  totalComments: number;
};

// ─── Obtiene el access token si la conexión es válida ──
// El token es de una Página de Facebook (no caduca por sí
// solo salvo que Meta lo invalide). Aun así guardamos una
// fecha de caducidad por seguridad.
// ─────────────────────────────────────────────────────
async function getValidFacebookToken(
  businessId: string,
  userId: string,
): Promise<{
  accessToken: string;
  pageId: string;
  pageName?: string;
  username?: string;
} | null> {
  const business = await prisma.business.findFirst({
    where: { id: businessId, userId },
    select: {
      facebookAccessToken: true,
      facebookTokenExpiry: true,
      facebookPageId: true,
      facebookPageName: true,
      facebookUsername: true,
    },
  });

  if (!business?.facebookAccessToken || !business.facebookPageId) {
    return null;
  }

  if (isFacebookTokenExpired(business.facebookTokenExpiry)) {
    return null;
  }

  return {
    accessToken: business.facebookAccessToken,
    pageId: business.facebookPageId,
    pageName: business.facebookPageName ?? undefined,
    username: business.facebookUsername ?? undefined,
  };
}

// ─── Obtiene publicaciones + comentarios de Facebook ─
// Devuelve las publicaciones recientes de la página con
// sus comentarios. Si no está conectado o el token caducó,
// devuelve null (la sección lo avisa).
// ─────────────────────────────────────────────────────
export const getBusinessFacebookData = async (businessId: string) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user?.id ?? '';
  if (!userId) throw new Error('No autenticado');

  const conn = await getValidFacebookToken(businessId, userId);
  if (!conn) return null;

  const now = Date.now();
  const cutoff = new Date(now - 90 * 86400 * 1000);

  // 1. ¿Tenemos caché reciente? La devolvemos sin llamar a
  //    la Graph API.
  const cached = await prisma.business.findUnique({
    where: { id: businessId },
    select: { facebookCacheAt: true, facebookCache: true },
  });
  if (
    cached?.facebookCacheAt &&
    now - cached.facebookCacheAt.getTime() < CACHE_TTL_MS &&
    cached.facebookCache
  ) {
    return cached.facebookCache as unknown as FacebookData;
  }

  const posts = await getFacebookCommentsData(conn.accessToken, conn.pageId, 8);

  // Normalizamos: descartamos publicaciones muy antiguas y
  // dejamos una estructura sencilla para el frontend.
  const filtered: FacebookPost[] = posts
    .filter((p) => new Date(p.created_time) > cutoff)
    .map((p) => ({ ...p, message: p.message ?? '' }));

  const normalized: FacebookData = {
    pageName: conn.pageName ?? '',
    username: conn.username ?? '',
    posts: filtered,
    totalComments: filtered.reduce(
      (acc: number, p: FacebookPost) => acc + (p.comments?.length ?? 0),
      0,
    ),
  };

  // 2. Guardamos en caché para no volver a llamar a la API
  //    en las próximas aperturas.
  await prisma.business.update({
    where: { id: businessId },
    data: { facebookCacheAt: new Date(), facebookCache: normalized as object },
  });

  return normalized;
};

// ─── Estado de la conexión con Facebook ──────────────
export const getFacebookConnectionStatus = async (businessId: string) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user?.id ?? '';
  if (!userId) throw new Error('No autenticado');

  const business = await prisma.business.findFirst({
    where: { id: businessId, userId },
    select: {
      facebookAccessToken: true,
      facebookTokenExpiry: true,
      facebookPageName: true,
      facebookPending: true,
    },
  });

  if (!business?.facebookAccessToken) {
    return {
      connected: false as const,
      pendingPages: readPendingPages(business?.facebookPending),
    };
  }

  return {
    connected: true as const,
    pageName: business.facebookPageName,
    expiresAt: business.facebookTokenExpiry,
    expired: isFacebookTokenExpired(business.facebookTokenExpiry),
    pendingPages: [] as { id: string; name: string; username: string | null }[],
  };
};

// ─── Conecta la Página de Facebook elegida ───────────
// Tras el OAuth, si el usuario administra varias páginas
// guardamos la lista en facebookPending y le pedimos que
// elija. Esta acción guarda la seleccionada como página
// del negocio y limpia la lista temporal.
// ─────────────────────────────────────────────────────
export const connectFacebookPage = async (
  businessId: string,
  pageId: string,
) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user?.id ?? '';
  if (!userId) throw new Error('No autenticado');

  const business = await prisma.business.findFirst({
    where: { id: businessId, userId },
    select: { facebookPending: true },
  });
  const pending = business?.facebookPending as FacebookPending | null;
  if (!pending?.token) {
    throw new Error('No hay páginas pendientes. Vuelve a conectar con Facebook.');
  }
  if (Date.now() - new Date(pending.at).getTime() > PENDING_TTL_MS) {
    throw new Error('La selección ha caducado. Vuelve a conectar con Facebook.');
  }

  // Obtenemos de nuevo las páginas para no fiarnos del
  // token que pueda enviar el cliente: usamos el token de
  // usuario guardado en el servidor.
  const pages = await getUserFacebookPages(pending.token);
  const page = pages.find((p) => p.id === pageId);
  if (!page) {
    throw new Error('No se encontró esa página entre las que administras.');
  }

  const expiry = pending.expiry
    ? new Date(pending.expiry)
    : new Date(Date.now() + 60 * 86400 * 1000);

  await prisma.business.update({
    where: { id: businessId },
    data: {
      facebookAccessToken: page.access_token,
      facebookTokenExpiry: expiry,
      facebookPageId: page.id,
      facebookPageName: page.name,
      facebookUsername: page.username ?? null,
      facebookCacheAt: null,
      facebookCache: null,
      facebookPending: null,
    },
  });

  // Suscribimos la página a los webhooks (opcional).
  try {
    await subscribePageToWebhooks(page.access_token, page.id);
  } catch (e) {
    console.error('[Facebook] No se pudo suscribir a webhooks:', e);
  }

  return { ok: true, pageName: page.name };
};

// ─── Responde un comentario publicando en Facebook ───
export const replyToFacebookComment = async (
  businessId: string,
  commentId: string,
  message: string,
) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user?.id ?? '';
  if (!userId) throw new Error('No autenticado');

  const conn = await getValidFacebookToken(businessId, userId);
  if (!conn)
    throw new Error(
      'Facebook no conectado o token caducado. Reconecta en Configuración.',
    );

  const result = await postFacebookCommentReply(
    conn.accessToken,
    commentId,
    message,
  );
  if (!result.ok) throw new Error(result.error ?? 'No se pudo publicar la respuesta');

  // Invalidamos la caché para que el dashboard muestre la
  // respuesta recién publicada al recargar.
  await prisma.business.update({
    where: { id: businessId },
    data: { facebookCacheAt: null, facebookCache: null },
  });

  return { ok: true, replyId: result.replyId };
};

// ─── Publica contenido en la página de Facebook ──────
export const publishToFacebookPage = async (
  businessId: string,
  message: string,
  imageUrl?: string,
) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user?.id ?? '';
  if (!userId) throw new Error('No autenticado');

  const conn = await getValidFacebookToken(businessId, userId);
  if (!conn)
    throw new Error(
      'Facebook no conectado o token caducado. Reconecta en Configuración.',
    );
  if (!message.trim() && !imageUrl) {
    throw new Error('Escribe un mensaje o añade una imagen');
  }

  const result = imageUrl
    ? await publishPagePhotoPost(
        conn.accessToken,
        conn.pageId,
        imageUrl,
        message,
      )
    : await publishPageTextPost(conn.accessToken, conn.pageId, message);
  if (!result.ok) throw new Error(result.error ?? 'No se pudo publicar');

  // Invalidamos la caché para que la publicación nueva
  // aparezca en el dashboard al recargar.
  await prisma.business.update({
    where: { id: businessId },
    data: { facebookCacheAt: null, facebookCache: null },
  });

  return { ok: true, postId: result.postId };
};

// ─── Tipo de salida para el frontend ─────────────────
export type FacebookSectionData = NonNullable<
  Awaited<ReturnType<typeof getBusinessFacebookData>>
>;