// Facebook Pages Graph API: lee publicaciones y comentarios de una Página,
// y permite responder y publicar con un token de página. Endpoints usados:
//   GET  /me                     → valida el token
//   GET  /me/accounts            → páginas que administra el usuario
//   GET  /{page-id}/posts        → publicaciones de la página
//   GET  /{post-id}/comments     → comentarios (con replies)
//   POST /{comment-id}/comments  → responder un comentario
//   POST /{page-id}/feed         → publicar texto
//   POST /{page-id}/photos       → publicar foto

const GRAPH_HOST = "https://graph.facebook.com/v21.0";

// ─── Tipos de publicación y comentarios ──────────────
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

// Convierte un error de la API de Facebook en un mensaje claro.
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

// Comprueba si el token está caducado (avisamos 2 días antes).
export function isFacebookTokenExpired(expiresAt: Date | null): boolean {
  if (!expiresAt) return true;
  return expiresAt.getTime() - 2 * 86400 * 1000 < Date.now();
}

// Obtiene el perfil de la página (también valida el token).
export async function getFacebookPageProfile(
  accessToken: string,
  pageId: string,
): Promise<FacebookPageProfile> {
  const url = `${GRAPH_HOST}/${pageId}?fields=id,name,username&access_token=${encodeURIComponent(accessToken)}`;
  const response = await fetch(url);

  if (!response.ok) {
    const body = await response.text();
    throw new Error(friendlyFacebookError(response.status, body));
  }

  const payload = (await response.json()) as {
    id?: string;
    name?: string;
    username?: string;
  };
  return {
    id: payload.id ?? pageId,
    name: payload.name ?? "",
    username: payload.username ?? undefined,
  };
}

// Obtiene las publicaciones recientes de la página (máx. 2 páginas de paginación).
export async function getPagePosts(
  accessToken: string,
  pageId: string,
  limit = 25,
): Promise<FacebookPost[]> {
  const posts: FacebookPost[] = [];
  const fields =
    "id,message,created_time,permalink_url,full_picture,comments{summary{total_count}}";
  let url = `${GRAPH_HOST}/${pageId}/posts?fields=${encodeURIComponent(fields)}&limit=${Math.min(limit, 100)}&access_token=${encodeURIComponent(accessToken)}`;

  for (let page = 0; page < 2; page++) {
    const response = await fetch(url);
    if (!response.ok) {
      const body = await response.text();
      throw new Error(friendlyFacebookError(response.status, body));
    }
    const payload = (await response.json()) as {
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
    if (payload?.data) {
      posts.push(
        ...payload.data.map((post) => ({
          id: post.id,
          message: post.message,
          created_time: post.created_time ?? "",
          permalink_url: post.permalink_url,
          full_picture: post.full_picture,
          comments_count: post.comments?.summary?.total_count ?? 0,
        })),
      );
    }
    if (posts.length >= limit || !payload?.paging?.next) break;
    url = payload.paging.next;
  }

  return posts.slice(0, limit);
}

// Obtiene los comentarios de una publicación, agrupando las respuestas
// anidadas bajo su comentario padre.
export async function getPostComments(
  accessToken: string,
  postId: string,
): Promise<FacebookComment[]> {
  const fields = "id,message,created_time,from{id,name},parent_id";
  const url = `${GRAPH_HOST}/${postId}/comments?fields=${encodeURIComponent(fields)}&limit=100&access_token=${encodeURIComponent(accessToken)}`;
  const response = await fetch(url);

  if (!response.ok) {
    const body = await response.text();
    console.error(`[Facebook] Error obteniendo comentarios de ${postId}:`, body);
    return [];
  }

  const payload = (await response.json()) as {
    data?: Array<{
      id: string;
      message?: string;
      created_time?: string;
      from?: { id?: string; name?: string };
      parent_id?: string;
    }>;
  };

  const flattened = (payload?.data ?? []).map(
    (comment): FacebookComment => ({
      id: comment.id,
      text: comment.message ?? "",
      timestamp: comment.created_time ?? "",
      username: comment.from?.name ?? "Anónimo",
      from_id: comment.from?.id,
      parent_id: comment.parent_id,
      replies: [],
    }),
  );

  const topLevelComments = flattened.filter((comment) => !comment.parent_id);
  const repliesByParent = new Map<string, FacebookComment[]>();
  for (const comment of flattened) {
    if (comment.parent_id) {
      const replies = repliesByParent.get(comment.parent_id) ?? [];
      replies.push(comment);
      repliesByParent.set(comment.parent_id, replies);
    }
  }

  return topLevelComments.map((comment) => ({
    ...comment,
    replies: (repliesByParent.get(comment.id) ?? []).map((reply) => ({
      ...reply,
      replies: [],
    })),
  }));
}

// Obtiene publicaciones con sus comentarios.
export async function getFacebookCommentsData(
  accessToken: string,
  pageId: string,
  limit = 8,
): Promise<FacebookPost[]> {
  const posts = await getPagePosts(accessToken, pageId, limit);

  // Consultamos SIEMPRE los comentarios: el summary de Meta no siempre
  // viene y quedaba en 0, por lo que los comentarios no se leían.
  const postsWithComments = await Promise.all(
    posts.map(async (post) => ({
      ...post,
      comments: await getPostComments(accessToken, post.id),
    })),
  );

  return postsWithComments;
}

// Publica una respuesta a un comentario. En Facebook se responde creando un
// comentario en /comments (no en /replies, que da "Unsupported post request").
export async function postFacebookCommentReply(
  accessToken: string,
  commentId: string,
  message: string,
): Promise<{ ok: boolean; replyId?: string; error?: string }> {
  const safeMessage = message.slice(0, 1000);
  const url = `${GRAPH_HOST}/${commentId}/comments?message=${encodeURIComponent(safeMessage)}&access_token=${encodeURIComponent(accessToken)}`;
  const response = await fetch(url, { method: "POST" });

  if (!response.ok) {
    const body = await response.text();
    return { ok: false, error: friendlyFacebookError(response.status, body) };
  }

  const payload = (await response.json()) as { id?: string };
  return { ok: true, replyId: payload.id };
}

// Publica un texto en la página de Facebook.
export async function publishPageTextPost(
  accessToken: string,
  pageId: string,
  message: string,
): Promise<{ ok: boolean; postId?: string; error?: string }> {
  const safeMessage = message.slice(0, 5000);
  const url = `${GRAPH_HOST}/${pageId}/feed?message=${encodeURIComponent(safeMessage)}&access_token=${encodeURIComponent(accessToken)}`;
  const response = await fetch(url, { method: "POST" });

  if (!response.ok) {
    const body = await response.text();
    return { ok: false, error: friendlyFacebookError(response.status, body) };
  }

  const payload = (await response.json()) as { id?: string };
  return { ok: true, postId: payload.id };
}

// Publica una foto (por URL) con texto en la página.
export async function publishPagePhotoPost(
  accessToken: string,
  pageId: string,
  imageUrl: string,
  message: string,
): Promise<{ ok: boolean; postId?: string; error?: string }> {
  const safeMessage = message.slice(0, 5000);
  const url = `${GRAPH_HOST}/${pageId}/photos?url=${encodeURIComponent(imageUrl)}&message=${encodeURIComponent(safeMessage)}&access_token=${encodeURIComponent(accessToken)}`;
  const response = await fetch(url, { method: "POST" });

  if (!response.ok) {
    const body = await response.text();
    return { ok: false, error: friendlyFacebookError(response.status, body) };
  }

  const payload = (await response.json()) as { id?: string };
  return { ok: true, postId: payload.id };
}

// Suscribe la página a los webhooks de la app. Sin esto Meta no envía
// notificaciones a /api/webhooks/meta. Es opcional: si falla, seguimos con la caché.
export async function subscribePageToWebhooks(
  accessToken: string,
  pageId: string,
): Promise<{ ok: boolean; error?: string }> {
  const url = `${GRAPH_HOST}/${pageId}/subscribed_apps?subscribed_fields=feed&access_token=${encodeURIComponent(accessToken)}`;
  const response = await fetch(url, { method: "POST" });

  if (!response.ok) {
    const body = await response.text();
    return { ok: false, error: friendlyFacebookError(response.status, body) };
  }

  return { ok: true };
}

// Lista las páginas que administra un token de usuario (/me/accounts).
export async function getUserFacebookPages(
  accessToken: string,
): Promise<FacebookManagedPage[]> {
  const url = `${GRAPH_HOST}/me/accounts?fields=id,name,username,access_token&access_token=${encodeURIComponent(accessToken)}`;
  const response = await fetch(url);

  if (!response.ok) {
    const body = await response.text();
    throw new Error(friendlyFacebookError(response.status, body));
  }

  const payload = (await response.json()) as {
    data?: Array<{
      id: string;
      name?: string;
      username?: string;
      access_token?: string;
    }>;
  };

  return (payload?.data ?? [])
    .filter((page) => page.access_token)
    .map((page) => ({
      id: page.id,
      name: page.name ?? "",
      username: page.username ?? undefined,
      access_token: page.access_token!,
    }));
}

// Páginas de portfolios empresariales. /me/accounts NO las devuelve; hay que
// listar /me/businesses y luego /{business-id}/owned_pages (business_management).
export async function getBusinessOwnedPages(
  accessToken: string,
): Promise<FacebookManagedPage[]> {
  const businessesUrl = `${GRAPH_HOST}/me/businesses?fields=id,name&access_token=${encodeURIComponent(accessToken)}`;
  const businessesResponse = await fetch(businessesUrl);
  if (!businessesResponse.ok) {
    console.error(
      "[Facebook] Error listando businesses:",
      await businessesResponse.text(),
    );
    return [];
  }

  const businessesPayload = (await businessesResponse.json()) as {
    data?: Array<{ id: string; name?: string }>;
  };
  const businesses = businessesPayload?.data ?? [];

  const pages: FacebookManagedPage[] = [];
  for (const business of businesses) {
    const url = `${GRAPH_HOST}/${business.id}/owned_pages?fields=id,name,username,access_token&limit=100&access_token=${encodeURIComponent(accessToken)}`;
    const response = await fetch(url);
    if (!response.ok) {
      console.error(
        `[Facebook] Error owned_pages de ${business.id}:`,
        await response.text(),
      );
      continue;
    }
    const payload = (await response.json()) as {
      data?: Array<{
        id: string;
        name?: string;
        username?: string;
        access_token?: string;
      }>;
    };
    for (const page of payload?.data ?? []) {
      if (page.access_token) {
        pages.push({
          id: page.id,
          name: page.name ?? "",
          username: page.username ?? undefined,
          access_token: page.access_token,
        });
      }
    }
  }

  return pages;
}
