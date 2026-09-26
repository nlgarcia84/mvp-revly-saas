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

// La caché evita llamar a la Graph API en cada apertura del dashboard
// (rate-limit y riesgo de que Meta marque la app).
const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutos

// Tiempo máximo para elegir página tras el OAuth.
const PENDING_TTL_MS = 15 * 60 * 1000; // 15 minutos

// Páginas guardadas temporalmente mientras el usuario elige cuál conectar.
type FacebookPending = {
  token: string;
  expiry: string;
  at: string;
  pages: { id: string; name: string; username: string | null }[];
};

type FacebookData = {
  pageName: string;
  username: string;
  posts: FacebookPost[];
  totalComments: number;
};

// Devuelve el id del usuario autenticado o lanza si no hay sesión.
async function requireUserId(): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');
  return user.id;
}

// Lee las páginas pendientes de elegir, descartando las caducadas.
function readPendingPages(
  pending: unknown,
): { id: string; name: string; username: string | null }[] {
  const data = pending as FacebookPending | null;
  if (!data?.pages?.length) return [];
  if (Date.now() - new Date(data.at).getTime() > PENDING_TTL_MS) return [];
  return data.pages;
}

// Devuelve el token de la Página si la conexión sigue siendo válida.
async function getValidFacebookToken(businessId: string, userId: string) {
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

  if (!business?.facebookAccessToken || !business.facebookPageId) return null;
  if (isFacebookTokenExpired(business.facebookTokenExpiry)) return null;

  return {
    accessToken: business.facebookAccessToken,
    pageId: business.facebookPageId,
    pageName: business.facebookPageName ?? undefined,
    username: business.facebookUsername ?? undefined,
  };
}

// Devuelve publicaciones y comentarios recientes. Null si no hay conexión.
export const getBusinessFacebookData = async (businessId: string) => {
  const userId = await requireUserId();

  const connection = await getValidFacebookToken(businessId, userId);
  if (!connection) return null;

  const now = Date.now();
  const cutoff = new Date(now - 90 * 86400 * 1000);

  // 1) Caché reciente: la devolvemos sin llamar a la Graph API.
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

  const posts = await getFacebookCommentsData(
    connection.accessToken,
    connection.pageId,
    8,
  );

  // Descartamos publicaciones muy antiguas y normalizamos la estructura.
  const recentPosts: FacebookPost[] = posts
    .filter((post) => new Date(post.created_time) > cutoff)
    .map((post) => ({ ...post, message: post.message ?? '' }));

  const facebookData: FacebookData = {
    pageName: connection.pageName ?? '',
    username: connection.username ?? '',
    posts: recentPosts,
    totalComments: recentPosts.reduce(
      (total, post) => total + (post.comments?.length ?? 0),
      0,
    ),
  };

  // 2) Guardamos en caché para las próximas aperturas.
  await prisma.business.update({
    where: { id: businessId },
    data: { facebookCacheAt: new Date(), facebookCache: facebookData as object },
  });

  return facebookData;
};

// Estado de la conexión con Facebook, para Settings.
export const getFacebookConnectionStatus = async (businessId: string) => {
  const userId = await requireUserId();

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

// Guarda la Página elegida tras el OAuth y limpia la lista temporal.
export const connectFacebookPage = async (
  businessId: string,
  pageId: string,
) => {
  const userId = await requireUserId();

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

  // Reobtenemos las páginas en el servidor para no fiarnos del cliente.
  const pages = await getUserFacebookPages(pending.token);
  const page = pages.find((candidate) => candidate.id === pageId);
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
  } catch (error) {
    console.error('[Facebook] No se pudo suscribir a webhooks:', error);
  }

  return { ok: true, pageName: page.name };
};

// Responde a un comentario publicando en Facebook.
export const replyToFacebookComment = async (
  businessId: string,
  commentId: string,
  message: string,
) => {
  const userId = await requireUserId();

  const connection = await getValidFacebookToken(businessId, userId);
  if (!connection) {
    throw new Error(
      'Facebook no conectado o token caducado. Reconecta en Configuración.',
    );
  }

  const result = await postFacebookCommentReply(
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
    data: { facebookCacheAt: null, facebookCache: null },
  });

  return { ok: true, replyId: result.replyId };
};

// Publica contenido en la página de Facebook.
export const publishToFacebookPage = async (
  businessId: string,
  message: string,
  imageUrl?: string,
) => {
  const userId = await requireUserId();

  const connection = await getValidFacebookToken(businessId, userId);
  if (!connection) {
    throw new Error(
      'Facebook no conectado o token caducado. Reconecta en Configuración.',
    );
  }
  if (!message.trim() && !imageUrl) {
    throw new Error('Escribe un mensaje o añade una imagen');
  }

  const result = imageUrl
    ? await publishPagePhotoPost(
        connection.accessToken,
        connection.pageId,
        imageUrl,
        message,
      )
    : await publishPageTextPost(
        connection.accessToken,
        connection.pageId,
        message,
      );
  if (!result.ok) throw new Error(result.error ?? 'No se pudo publicar');

  // Invalidamos la caché para mostrar la publicación al recargar.
  await prisma.business.update({
    where: { id: businessId },
    data: { facebookCacheAt: null, facebookCache: null },
  });

  return { ok: true, postId: result.postId };
};

export type FacebookSectionData = NonNullable<
  Awaited<ReturnType<typeof getBusinessFacebookData>>
>;
