// Instagram API with Instagram Login (Business Login). No requiere página de
// Facebook: el usuario se autentica en Instagram y la app llama a
// graph.instagram.com. La cuenta debe ser profesional (Business o Creator).
// Flujo de tokens: code → short-lived (~1h) → long-lived (60 días).
// No hay renovación indefinida: si caduca, el usuario vuelve a conectar.

const GRAPH_HOST = "https://graph.instagram.com";
const TOKEN_ENDPOINT = "https://api.instagram.com/oauth/access_token";
const TOKEN_TTL_DAYS = 60;

// Credenciales de Instagram. El flujo "Instagram API with Instagram Login" usa
// el App ID/Secret de Instagram, distintos de los de Facebook. Si no están,
// caemos a META_CLIENT_ID/SECRET por compatibilidad.
export function getInstagramClientId(): string {
  return process.env.META_INSTAGRAM_CLIENT_ID || process.env.META_CLIENT_ID || "";
}

export function getInstagramClientSecret(): string {
  return (
    process.env.META_INSTAGRAM_CLIENT_SECRET ||
    process.env.META_CLIENT_SECRET ||
    ""
  );
}

type GraphResponse = {
  id?: string;
  access_token?: string;
  expires_in?: number;
  data?: unknown[];
  error?: {
    type?: string;
    message?: string;
    code?: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
  paging?: { next?: string; cursors?: { after?: string } };
};

// ─── Tipos de media y comentarios ────────────────────
export type InstagramMedia = {
  id: string;
  caption?: string;
  timestamp: string;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM" | "REELS";
  permalink: string;
  thumbnail_url?: string;
  media_url?: string;
  comments_count?: number;
};

export type InstagramComment = {
  id: string;
  text: string;
  timestamp: string;
  username: string;
  from_id?: string;
  replies: InstagramComment[];
};

export type InstagramMediaWithComments = InstagramMedia & {
  comments: InstagramComment[];
};

export type InstagramUserProfile = {
  id: string;
  username: string;
  accountType: "BUSINESS" | "CREATOR" | string;
};

// Convierte un error de la API de Meta en un mensaje claro, con datos
// técnicos (subcódigo, trace) para poder diagnosticar.
export function friendlyMetaError(status: number, body: string): string {
  let message = body.slice(0, 400);
  let diagnostics = "";
  try {
    const parsed = JSON.parse(body) as GraphResponse;
    const error = parsed?.error;
    if (error?.message) message = error.message;

    if (error) {
      const details: string[] = [];
      if (error.type) details.push(`tipo ${error.type}`);
      if (typeof error.code !== "undefined") details.push(`código ${error.code}`);
      if (typeof error.error_subcode !== "undefined") {
        details.push(`subcódigo ${error.error_subcode}`);
      }
      if (error.fbtrace_id) details.push(`trace ${error.fbtrace_id}`);
      if (details.length) diagnostics = ` (${details.join(", ")})`;
    }

    if (error?.code === 190) {
      return "El token de Instagram ha caducado. Vuelve a conectar la cuenta desde Configuración.";
    }
    if (error?.code === 200) {
      return `Instagram no tiene acceso a esta cuenta: ${message}${diagnostics}. Comprueba los permisos de la app y que la cuenta sea Business o Creator.`;
    }
  } catch {
    // no es JSON, usamos el texto tal cual
  }
  return `Instagram API error ${status}: ${message}${diagnostics}`;
}

// Convierte un token corto en long-lived (60 días).
export async function exchangeForLongLivedToken(
  accessToken: string,
): Promise<{ accessToken: string; expiresAt: Date }> {
  const clientSecret = getInstagramClientSecret();

  const params = new URLSearchParams({
    grant_type: "ig_exchange_token",
    client_secret: clientSecret,
    access_token: accessToken,
  });
  const response = await fetch(`${GRAPH_HOST}/access_token?${params.toString()}`);

  if (!response.ok) {
    const body = await response.text();
    throw new Error(friendlyMetaError(response.status, body));
  }

  const payload = (await response.json()) as GraphResponse;
  if (!payload?.access_token) {
    throw new Error("Instagram no devolvió un token long-lived");
  }

  const expiresIn = payload.expires_in ?? TOKEN_TTL_DAYS * 86400;
  return {
    accessToken: payload.access_token,
    expiresAt: new Date(Date.now() + expiresIn * 1000),
  };
}

// Renueva un token long-lived (otros 60 días). Meta permite refrescarlo una
// vez ha pasado al menos 24 h desde su emisión.
export async function refreshLongLivedToken(
  accessToken: string,
): Promise<{ accessToken: string; expiresAt: Date }> {
  const params = new URLSearchParams({
    grant_type: "ig_refresh_token",
    access_token: accessToken,
  });
  const response = await fetch(
    `${GRAPH_HOST}/refresh_access_token?${params.toString()}`,
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(friendlyMetaError(response.status, body));
  }

  const payload = (await response.json()) as GraphResponse;
  if (!payload?.access_token) {
    throw new Error("Instagram no devolvió un token renovado");
  }

  const expiresIn = payload.expires_in ?? TOKEN_TTL_DAYS * 86400;
  return {
    accessToken: payload.access_token,
    expiresAt: new Date(Date.now() + expiresIn * 1000),
  };
}

// Comprueba si el token está caducado (avisamos 2 días antes).
export function isInstagramTokenExpired(expiresAt: Date | null): boolean {
  if (!expiresAt) return true;
  return expiresAt.getTime() - 2 * 86400 * 1000 < Date.now();
}

// Obtiene el perfil de la cuenta. Usamos /me en vez de /{user_id} porque con
// Instagram Login el ID del token no siempre es válido para el Graph API.
export async function getInstagramUserProfile(
  accessToken: string,
  userId?: string,
): Promise<InstagramUserProfile> {
  const url = `${GRAPH_HOST}/me?fields=user_id,username,account_type&access_token=${encodeURIComponent(accessToken)}`;
  const response = await fetch(url);

  if (!response.ok) {
    const body = await response.text();
    console.error("[Instagram] Error obteniendo perfil:", body);
    throw new Error(friendlyMetaError(response.status, body));
  }

  const payload = (await response.json()) as {
    id?: string;
    user_id?: string;
    username?: string;
    account_type?: string;
  };
  return {
    id: payload.user_id ?? payload.id ?? userId ?? "",
    username: payload.username ?? "",
    accountType: (payload.account_type ?? "").toUpperCase(),
  };
}

// Obtiene las publicaciones recientes (máx. 2 páginas de paginación).
export async function getRecentMedia(
  accessToken: string,
  instagramUserId: string,
  limit = 12,
): Promise<InstagramMedia[]> {
  const media: InstagramMedia[] = [];
  let url = `${GRAPH_HOST}/${instagramUserId}/media?fields=id,caption,timestamp,media_type,permalink,thumbnail_url,media_url,comments_count&limit=${Math.min(limit, 25)}&access_token=${encodeURIComponent(accessToken)}`;

  for (let page = 0; page < 2; page++) {
    const response = await fetch(url);
    if (!response.ok) {
      const body = await response.text();
      throw new Error(friendlyMetaError(response.status, body));
    }
    const payload = (await response.json()) as {
      data?: InstagramMedia[];
      paging?: { next?: string };
    };
    if (payload?.data) media.push(...payload.data);
    if (media.length >= limit || !payload?.paging?.next) break;
    url = payload.paging.next;
  }

  return media.slice(0, limit);
}

// Obtiene los comentarios de una publicación (con sus respuestas).
export async function getMediaComments(
  accessToken: string,
  mediaId: string,
): Promise<InstagramComment[]> {
  const fields =
    "id,text,timestamp,username,from{id,username},replies{id,text,timestamp,username,from{id,username}}";
  const url = `${GRAPH_HOST}/${mediaId}/comments?fields=${fields}&limit=50&access_token=${encodeURIComponent(accessToken)}`;
  const response = await fetch(url);

  if (!response.ok) {
    const body = await response.text();
    console.error(`[Instagram] Error obteniendo comentarios de ${mediaId}:`, body);
    return [];
  }

  const payload = (await response.json()) as {
    data?: Array<{
      id: string;
      text?: string;
      timestamp?: string;
      username?: string;
      from?: { id?: string; username?: string };
      replies?: {
        data?: Array<{
          id: string;
          text?: string;
          timestamp?: string;
          username?: string;
          from?: { id?: string; username?: string };
        }>;
      };
    }>;
  };

  return (payload?.data ?? []).map((comment) => ({
    id: comment.id,
    text: comment.text ?? "",
    timestamp: comment.timestamp ?? "",
    username: comment.username ?? comment.from?.username ?? "Anónimo",
    from_id: comment.from?.id,
    replies: (comment.replies?.data ?? []).map((reply) => ({
      id: reply.id,
      text: reply.text ?? "",
      timestamp: reply.timestamp ?? "",
      username: reply.username ?? reply.from?.username ?? "Anónimo",
      from_id: reply.from?.id,
      replies: [],
    })),
  }));
}

// Obtiene publicaciones recientes con sus comentarios. Solo consultamos los
// comentarios de publicaciones que tienen alguno.
export async function getInstagramCommentsData(
  accessToken: string,
  instagramUserId: string,
  limit = 8,
): Promise<InstagramMediaWithComments[]> {
  const media = await getRecentMedia(accessToken, instagramUserId, limit);

  const mediaWithComments = await Promise.all(
    media.map(async (item) => {
      if ((item.comments_count ?? 0) > 0) {
        const comments = await getMediaComments(accessToken, item.id);
        return { ...item, comments };
      }
      return { ...item, comments: [] };
    }),
  );

  return mediaWithComments;
}

// Publica una respuesta a un comentario.
export async function postCommentReply(
  accessToken: string,
  commentId: string,
  message: string,
): Promise<{ ok: boolean; replyId?: string; error?: string }> {
  const safeMessage = message.slice(0, 1000);
  const url = `${GRAPH_HOST}/${commentId}/replies?message=${encodeURIComponent(safeMessage)}&access_token=${encodeURIComponent(accessToken)}`;
  const response = await fetch(url, { method: "POST" });

  if (!response.ok) {
    const body = await response.text();
    return { ok: false, error: friendlyMetaError(response.status, body) };
  }

  const payload = (await response.json()) as { id?: string };
  return { ok: true, replyId: payload.id };
}
