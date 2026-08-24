'use server';

import prisma from '@/lib/db';
import { createClient } from '@/lib/supabase/server';
import {
  getFacebookCommentsData,
  isFacebookTokenExpired,
  postFacebookCommentReply,
  publishPagePhotoPost,
  publishPageTextPost,
  type FacebookPost,
} from '@/lib/facebook-graph';

// La caché evita llamar a la Graph API de Facebook en cada
// apertura del dashboard (rate-limit y riesgo de que Meta
// marque la app por uso automatizado).
const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutos

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
async function getValidFacebookToken(businessId: string): Promise<{
  accessToken: string;
  pageId: string;
  pageName?: string;
  username?: string;
} | null> {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
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
    data: { session },
  } = await supabase.auth.getSession();
  const userId = session?.user?.id ?? '';
  if (!userId) throw new Error('No autenticado');

  const conn = await getValidFacebookToken(businessId);
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
    data: { session },
  } = await supabase.auth.getSession();
  const userId = session?.user?.id ?? '';
  if (!userId) throw new Error('No autenticado');

  const business = await prisma.business.findFirst({
    where: { id: businessId, userId },
    select: {
      facebookAccessToken: true,
      facebookTokenExpiry: true,
      facebookPageName: true,
    },
  });

  if (!business?.facebookAccessToken) {
    return { connected: false };
  }

  return {
    connected: true,
    pageName: business.facebookPageName,
    expiresAt: business.facebookTokenExpiry,
    expired: isFacebookTokenExpired(business.facebookTokenExpiry),
  };
};

// ─── Responde un comentario publicando en Facebook ───
export const replyToFacebookComment = async (
  businessId: string,
  commentId: string,
  message: string,
) => {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const userId = session?.user?.id ?? '';
  if (!userId) throw new Error('No autenticado');

  const conn = await getValidFacebookToken(businessId);
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
    data: { session },
  } = await supabase.auth.getSession();
  const userId = session?.user?.id ?? '';
  if (!userId) throw new Error('No autenticado');

  const conn = await getValidFacebookToken(businessId);
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
  return { ok: true, postId: result.postId };
};

// ─── Tipo de salida para el frontend ─────────────────
export type FacebookSectionData = NonNullable<
  Awaited<ReturnType<typeof getBusinessFacebookData>>
>;