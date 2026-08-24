// ─── Facebook Pages Graph API ─────────────────────────
// Lee publicaciones y comentarios de una Página de
// Facebook y permite responder y publicar usando un token
// de página (permisos pages_show_list, pages_read_engagement,
// pages_manage_posts, pages_manage_comments).
//
//   GET /me → perfil (valida el token)
//   GET /me/accounts → páginas que administra el usuario
//   GET /{page-id}/posts → publicaciones de la página
//   GET /{post-id}/comments → comentarios (con replies)
//   POST /{comment-id}/replies → responder un comentario
//   POST /{page-id}/feed → publicar texto en la página
//   POST /{page-id}/photos → publicar foto en la página
// ─────────────────────────────────────────────────────

const GRAPH_HOST = "https://graph.facebook.com/v21.0";

type GraphResponse = {
  id?: string;
  access_token?: string;
  expires_in?: number;
  data?: unknown[];
  error?: { type?: string; message?: string; code?: number };
  paging?: { next?: string; cursors?: { after?: string } };
};

// ─── Tipos de Publicación y Comentarios ──────────────
export type FacebookPost = {
  id: string;
  message?: string;
  created_time: string;
  permalink_url?: string;
  full_picture?: string;
  comments_count?: number;
  comments?: FacebookComment[];
};

export type FacebookComment = {
  id: string;
  text: string;
  timestamp: string;
  username: string;
  from_id?: string;
  parent_id?: string;
  replies: FacebookComment[];
};

export type FacebookPageProfile = {
  id: string;
  name: string;
  username?: string;
};

export type FacebookManagedPage = FacebookPageProfile & {
  access_token: string;
};

// ─── Convierte un error de la API en mensaje claro ────
export function friendlyFacebookError(status: number, body: string): string {
  let message = body.slice(0, 400);
  try {
    const parsed = JSON.parse(body);
    if (parsed?.error?.message) message = parsed.error.message;
    if (parsed?.error?.code === 190) {
      return "El token de Facebook ha caducado. Vuelve a conectar la página desde Configuración.";
    }
    if (parsed?.error?.code === 200) {
      return `Facebook no tiene acceso a esta página: ${parsed.error.message}. Comprueba los permisos de la app.`;
    }
    if (parsed?.error?.code === 100) {
      return `Parámetro incorrecto en la petición a Facebook: ${parsed.error.message}`;
    }
    if (parsed?.error?.code >= 4) {
      return `Facebook ha limitado el uso (${parsed.error.code}): ${parsed.error.message}`;
    }
  } catch {
    // no es JSON, usamos el texto tal cual
  }
  return `Facebook API error ${status}: ${message}`;
}

// ─── Comprueba si el token está caducado ─────────────
export function isFacebookTokenExpired(expiresAt: Date | null): boolean {
  if (!expiresAt) return true;
  // Avisamos 2 días antes para que el usuario reconecte a tiempo
  return expiresAt.getTime() - 2 * 86400 * 1000 < Date.now();
}

// ─── Obtiene el perfil / valida el token de página ───
export async function getFacebookPageProfile(
  accessToken: string,
  pageId: string,
): Promise<FacebookPageProfile> {
  const url = `${GRAPH_HOST}/${pageId}?fields=id,name,username&access_token=${encodeURIComponent(accessToken)}`;
  const res = await fetch(url);

  if (!res.ok) {
    const body = await res.text();
    throw new Error(friendlyFacebookError(res.status, body));
  }

  const data = (await res.json()) as {
    id?: string;
    name?: string;
    username?: string;
  };
  return {
    id: data.id ?? pageId,
    name: data.name ?? "",
    username: data.username ?? undefined,
  };
}

// ─── Obtiene las publicaciones recientes de la página ─
export async function getPagePosts(
  accessToken: string,
  pageId: string,
  limit = 25,
): Promise<FacebookPost[]> {
  const posts: FacebookPost[] = [];
  const fields =
    "id,message,created_time,permalink_url,full_picture,comments{summary{total_count}}";
  let url = `${GRAPH_HOST}/${pageId}/posts?fields=${encodeURIComponent(fields)}&limit=${Math.min(limit, 100)}&access_token=${encodeURIComponent(accessToken)}`;

  // Pedimos como mucho 2 páginas (paginación con cursor)
  for (let page = 0; page < 2; page++) {
    const res = await fetch(url);
    if (!res.ok) {
      const body = await res.text();
      throw new Error(friendlyFacebookError(res.status, body));
    }
    const data = (await res.json()) as {
      data?: Array<{
        id: string;
        message?: string;
        created_time?: string;
        permalink_url?: string;
        full_picture?: string;
        comments?: { summary?: { total_count?: number } };
      }>;
      paging?: { next?: string };
    };
    if (data?.data) {
      posts.push(
        ...data.data.map((p) => ({
          id: p.id,
          message: p.message,
          created_time: p.created_time ?? "",
          permalink_url: p.permalink_url,
          full_picture: p.full_picture,
          comments_count: p.comments?.summary?.total_count ?? 0,
        })),
      );
    }
    if (posts.length >= limit || !data?.paging?.next) break;
    url = data.paging.next;
  }

  return posts.slice(0, limit);
}

// ─── Obtiene los comentarios de una publicación ──────
// Los comentarios de Facebook devuelven las respuesta
// anidadas (replies) junto con parent_id; las agrupamos
// en la estructura "replies" para el frontend.
export async function getPostComments(
  accessToken: string,
  postId: string,
): Promise<FacebookComment[]> {
  const fields =
    "id,message,created_time,from{id,name},parent_id&summary=total_count";
  const url = `${GRAPH_HOST}/${postId}/comments?fields=${encodeURIComponent(fields)}&limit=100&access_token=${encodeURIComponent(accessToken)}`;
  const res = await fetch(url);

  if (!res.ok) {
    const body = await res.text();
    console.error(`[Facebook] Error obteniendo comentarios de ${postId}:`, body);
    return [];
  }

  const data = (await res.json()) as {
    data?: Array<{
      id: string;
      message?: string;
      created_time?: string;
      from?: { id?: string; name?: string };
      parent_id?: string;
    }>;
  };

  const flat = (data?.data ?? []).map((c): FacebookComment => ({
    id: c.id,
    text: c.message ?? "",
    timestamp: c.created_time ?? "",
    username: c.from?.name ?? "Anónimo",
    from_id: c.from?.id,
    parent_id: c.parent_id,
    replies: [],
  }));

  // Agrupamos las respuestas bajo su comentario padre
  const topLevel = flat.filter((c) => !c.parent_id);
  const byParent = new Map<string, FacebookComment[]>();
  for (const c of flat) {
    if (c.parent_id) {
      const list = byParent.get(c.parent_id) ?? [];
      list.push(c);
      byParent.set(c.parent_id, list);
    }
  }

  return topLevel.map((c) => ({
    ...c,
    replies: (byParent.get(c.id) ?? []).map((r) => ({
      ...r,
      replies: [],
    })),
  }));
}

// ─── Obtiene publicaciones + comentarios de la página ─
export async function getFacebookCommentsData(
  accessToken: string,
  pageId: string,
  limit = 8,
): Promise<FacebookPost[]> {
  const posts = await getPagePosts(accessToken, pageId, limit);

  const withComments = await Promise.all(
    posts.map(async (p) => {
      // Solo consultamos comentarios si la publicación tiene alguno
      if ((p.comments_count ?? 0) > 0) {
        return { ...p, comments: await getPostComments(accessToken, p.id) };
      }
      return { ...p, comments: [] };
    }),
  );

  return withComments;
}

// ─── Publica una respuesta a un comentario ───────────
export async function postFacebookCommentReply(
  accessToken: string,
  commentId: string,
  message: string,
): Promise<{ ok: boolean; replyId?: string; error?: string }> {
  const safeMessage = message.slice(0, 1000);
  const url = `${GRAPH_HOST}/${commentId}/replies?message=${encodeURIComponent(safeMessage)}&access_token=${encodeURIComponent(accessToken)}`;
  const res = await fetch(url, { method: "POST" });

  if (!res.ok) {
    const body = await res.text();
    return { ok: false, error: friendlyFacebookError(res.status, body) };
  }

  const data = (await res.json()) as { id?: string };
  return { ok: true, replyId: data.id };
}

// ─── Publica un texto en la página de Facebook ───────
export async function publishPageTextPost(
  accessToken: string,
  pageId: string,
  message: string,
): Promise<{ ok: boolean; postId?: string; error?: string }> {
  const safeMessage = message.slice(0, 5000);
  const url = `${GRAPH_HOST}/${pageId}/feed?message=${encodeURIComponent(safeMessage)}&access_token=${encodeURIComponent(accessToken)}`;
  const res = await fetch(url, { method: "POST" });

  if (!res.ok) {
    const body = await res.text();
    return { ok: false, error: friendlyFacebookError(res.status, body) };
  }

  const data = (await res.json()) as { id?: string };
  return { ok: true, postId: data.id };
}

// ─── Publica una foto (URL) con texto en la página ───
export async function publishPagePhotoPost(
  accessToken: string,
  pageId: string,
  imageUrl: string,
  message: string,
): Promise<{ ok: boolean; postId?: string; error?: string }> {
  const safeMessage = message.slice(0, 5000);
  const url = `${GRAPH_HOST}/${pageId}/photos?url=${encodeURIComponent(imageUrl)}&message=${encodeURIComponent(safeMessage)}&access_token=${encodeURIComponent(accessToken)}`;
  const res = await fetch(url, { method: "POST" });

  if (!res.ok) {
    const body = await res.text();
    return { ok: false, error: friendlyFacebookError(res.status, body) };
  }

  const data = (await res.json()) as { id?: string };
  return { ok: true, postId: data.id };
}

// ─── Lista las páginas que administra un token de usuario ─
export async function getUserFacebookPages(
  accessToken: string,
): Promise<FacebookManagedPage[]> {
  const url = `${GRAPH_HOST}/me/accounts?fields=id,name,username,access_token&access_token=${encodeURIComponent(accessToken)}`;
  const res = await fetch(url);

  if (!res.ok) {
    const body = await res.text();
    throw new Error(friendlyFacebookError(res.status, body));
  }

  const data = (await res.json()) as {
    data?: Array<{
      id: string;
      name?: string;
      username?: string;
      access_token?: string;
    }>;
  };

  return (data?.data ?? [])
    .filter((p) => p.access_token)
    .map((p) => ({
      id: p.id,
      name: p.name ?? "",
      username: p.username ?? undefined,
      access_token: p.access_token!,
    }));
}