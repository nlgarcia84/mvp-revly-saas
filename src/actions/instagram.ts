'use server';

import prisma from '@/lib/db';
import { createClient } from '@/lib/supabase/server';
import {
  getInstagramCommentsData,
  isInstagramTokenExpired,
  postCommentReply,
  type InstagramComment,
  type InstagramMedia,
} from '@/lib/instagram-graph';

// La caché evita llamar a la Graph API de Instagram en cada
// apertura del dashboard (rate-limit ~200 llamadas/hora y
// riesgo de que Meta marque la app por uso automatizado).
const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutos

type InstagramData = {
  username: string;
  posts: {
    id: string;
    caption: string;
    timestamp: string;
    mediaType: string;
    permalink: string;
    thumbnailUrl: string;
    comments: InstagramComment[];
  }[];
  totalComments: number;
};

// ─── Obtiene el access token si la conexión es válida ──
// A diferencia de Google, Meta no permite renovar el token
// con un refresh token: dura 60 días y luego el usuario debe
// volver a conectar. Si está caducado devolvemos null.
// ─────────────────────────────────────────────────────
async function getValidInstagramToken(businessId: string): Promise<{
  accessToken: string;
  businessAccountId: string;
  username?: string;
} | null> {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: {
      instagramAccessToken: true,
      instagramTokenExpiry: true,
      instagramBusinessAccountId: true,
      instagramUsername: true,
    },
  });

  if (!business?.instagramAccessToken || !business.instagramBusinessAccountId) {
    return null;
  }

  if (isInstagramTokenExpired(business.instagramTokenExpiry)) {
    return null;
  }

  return {
    accessToken: business.instagramAccessToken,
    businessAccountId: business.instagramBusinessAccountId,
    username: business.instagramUsername ?? undefined,
  };
}

// ─── Obtiene publicaciones + comentarios de Instagram ─
// Devuelve las publicaciones recientes con sus comentarios
// para mostrarlos en el dashboard. Si no está conectado o
// el token caducó, devuelve null (la sección lo avisa).
// ─────────────────────────────────────────────────────
export const getBusinessInstagramData = async (businessId: string) => {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const userId = session?.user?.id ?? '';
  if (!userId) throw new Error('No autenticado');

  const conn = await getValidInstagramToken(businessId);
  if (!conn) return null;

  const now = Date.now();
  const cutoff = new Date(now - 90 * 86400 * 1000);

  // 1. ¿Tenemos caché reciente? La devolvemos sin llamar a
  //    la Graph API (evita el rate-limit y bloqueos de Meta).
  const cached = await prisma.business.findUnique({
    where: { id: businessId },
    select: { instagramCacheAt: true, instagramCache: true },
  });
  if (
    cached?.instagramCacheAt &&
    now - cached.instagramCacheAt.getTime() < CACHE_TTL_MS &&
    cached.instagramCache
  ) {
    return cached.instagramCache as unknown as InstagramData;
  }

  const media = await getInstagramCommentsData(
    conn.accessToken,
    conn.businessAccountId,
    8,
  );

  // Normalizamos: descartamos publicaciones muy antiguas y
  // dejamos una estructura sencilla para el frontend.
  const posts = media
    .filter((m) => new Date(m.timestamp) > cutoff)
    .map((m) => ({
      id: m.id,
      caption: m.caption ?? '',
      timestamp: m.timestamp,
      mediaType: m.media_type,
      permalink: m.permalink,
      thumbnailUrl: m.thumbnail_url ?? m.media_url ?? '',
      comments: m.comments ?? [],
    }));

  const normalized: InstagramData = {
    username: conn.username ?? '',
    posts,
    totalComments: posts.reduce(
      (acc: number, p: { comments: InstagramComment[] }) =>
        acc + p.comments.length,
      0,
    ),
  };

  // 2. Guardamos en caché para no volver a llamar a la API
  //    en las próximas aperturas.
  await prisma.business.update({
    where: { id: businessId },
    data: { instagramCacheAt: new Date(), instagramCache: normalized as object },
  });

  return normalized;
};

// ─── Estado de la conexión con Instagram ─────────────
// Para mostrar en Settings si está conectado, con qué
// usuario y cuándo caduca el token.
// ─────────────────────────────────────────────────────
export const getInstagramConnectionStatus = async (businessId: string) => {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const userId = session?.user?.id ?? '';
  if (!userId) throw new Error('No autenticado');

  const business = await prisma.business.findFirst({
    where: { id: businessId, userId },
    select: {
      instagramAccessToken: true,
      instagramTokenExpiry: true,
      instagramUsername: true,
    },
  });

  if (!business?.instagramAccessToken) {
    return { connected: false };
  }

  return {
    connected: true,
    username: business.instagramUsername,
    expiresAt: business.instagramTokenExpiry,
    expired: isInstagramTokenExpired(business.instagramTokenExpiry),
  };
};

// ─── Responde un comentario publicando en Instagram ──
// Se usa desde el modal: la IA genera el texto y el botón
// "Publicar respuesta" hace la llamada POST /replies.
// ─────────────────────────────────────────────────────
export const replyToInstagramComment = async (
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

  const conn = await getValidInstagramToken(businessId);
  if (!conn) throw new Error('Instagram no conectado o token caducado. Reconecta en Configuración.');

  const result = await postCommentReply(conn.accessToken, commentId, message);
  if (!result.ok) throw new Error(result.error ?? 'No se pudo publicar la respuesta');
  return { ok: true, replyId: result.replyId };
};

// ─── Tipo de salida para el frontend ─────────────────
export type InstagramPost = {
  id: string;
  caption: string;
  timestamp: string;
  mediaType: InstagramMedia['media_type'];
  permalink: string;
  thumbnailUrl: string;
  comments: InstagramComment[];
};

export type InstagramSectionData = NonNullable<
  Awaited<ReturnType<typeof getBusinessInstagramData>>
>;