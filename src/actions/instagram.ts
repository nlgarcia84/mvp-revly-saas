'use server';

import prisma from '@/lib/db';
import { createClient } from '@/lib/supabase/server';
import {
  getInstagramCommentsData,
  isInstagramTokenExpired,
  postCommentReply,
  refreshLongLivedToken,
  type InstagramComment,
  type InstagramMedia,
} from '@/lib/instagram-graph';

// La caché evita llamar a la Graph API en cada apertura del dashboard
// (rate-limit ~200 llamadas/hora y riesgo de bloqueo por Meta).
const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutos

// Renovamos el token long-lived cuando le quedan menos de 7 días.
const REFRESH_WINDOW_MS = 7 * 86400 * 1000;

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

// Devuelve el id del usuario autenticado o lanza si no hay sesión.
async function requireUserId(): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');
  return user.id;
}

// Devuelve el token de Instagram si la conexión sigue válida. Meta no permite
// refresh token: el token dura 60 días y luego hay que reconectar.
async function getValidInstagramToken(businessId: string, userId: string) {
  const business = await prisma.business.findFirst({
    where: { id: businessId, userId },
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

  let accessToken = business.instagramAccessToken;
  let expiry = business.instagramTokenExpiry;

  // Si le quedan menos de 7 días, intentamos renovarlo. Si falla, seguimos
  // usando el token actual (aún válido) y avisamos por consola.
  if (expiry && expiry.getTime() - Date.now() < REFRESH_WINDOW_MS) {
    try {
      const refreshedToken = await refreshLongLivedToken(accessToken);
      accessToken = refreshedToken.accessToken;
      expiry = refreshedToken.expiresAt;
      await prisma.business.update({
        where: { id: businessId },
        data: {
          instagramAccessToken: accessToken,
          instagramTokenExpiry: expiry,
        },
      });
    } catch (error) {
      console.error('[Instagram] No se pudo renovar el token:', error);
    }
  }

  return {
    accessToken,
    businessAccountId: business.instagramBusinessAccountId,
    username: business.instagramUsername ?? undefined,
  };
}

// Devuelve publicaciones y comentarios recientes. Null si no hay conexión.
export const getBusinessInstagramData = async (businessId: string) => {
  const userId = await requireUserId();

  const connection = await getValidInstagramToken(businessId, userId);
  if (!connection) return null;

  const now = Date.now();
  const cutoff = new Date(now - 90 * 86400 * 1000);

  // 1) Caché reciente: la devolvemos sin llamar a la Graph API.
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
    connection.accessToken,
    connection.businessAccountId,
    8,
  );

  // Descartamos publicaciones muy antiguas y normalizamos la estructura.
  const posts = media
    .filter((item) => new Date(item.timestamp) > cutoff)
    .map((item) => ({
      id: item.id,
      caption: item.caption ?? '',
      timestamp: item.timestamp,
      mediaType: item.media_type,
      permalink: item.permalink,
      thumbnailUrl: item.thumbnail_url ?? item.media_url ?? '',
      comments: item.comments ?? [],
    }));

  const instagramData: InstagramData = {
    username: connection.username ?? '',
    posts,
    totalComments: posts.reduce(
      (total, post) => total + post.comments.length,
      0,
    ),
  };

  // 2) Guardamos en caché para las próximas aperturas.
  await prisma.business.update({
    where: { id: businessId },
    data: {
      instagramCacheAt: new Date(),
      instagramCache: instagramData as object,
    },
  });

  return instagramData;
};

// Estado de la conexión con Instagram, para Settings.
export const getInstagramConnectionStatus = async (businessId: string) => {
  const userId = await requireUserId();

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

// Responde a un comentario publicando en Instagram.
export const replyToInstagramComment = async (
  businessId: string,
  commentId: string,
  message: string,
) => {
  const userId = await requireUserId();

  const connection = await getValidInstagramToken(businessId, userId);
  if (!connection) {
    throw new Error(
      'Instagram no conectado o token caducado. Reconecta en Configuración.',
    );
  }

  const result = await postCommentReply(
    connection.accessToken,
    commentId,
    message,
  );
  if (!result.ok) {
    throw new Error(result.error ?? 'No se pudo publicar la respuesta');
  }

  // Invalidamos la caché para mostrar la respuesta al recargar.
  await prisma.business.update({
    where: { id: businessId },
    data: { instagramCacheAt: null, instagramCache: null },
  });

  return { ok: true, replyId: result.replyId };
};

// Tipo de salida para el frontend.
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
