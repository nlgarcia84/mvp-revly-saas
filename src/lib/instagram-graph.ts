// ─── Instagram API with Instagram Login (Business Login) ──
// Este flujo N0 requiere página de Facebook: el usuario se
// autentica directamente en Instagram (instagram.com/oauth/
// authorize) y la app hace llamadas a graph.instagram.com.
//
//   1. El negocio debe tener una cuenta profesional de
//      Instagram (Business o Creator).
//   2. La app en Meta se crea con el uso de caso "API de
//      Instagram" y las claves son el App ID y App Secret
//      de Instagram (distintos de los de Facebook).
//   3. Se pide permiso instagram_business_basic e
//      instagram_business_manage_comments.
//
// Tokens: code -> short-lived (~1h) -> long-lived (60 días).
// NO se puede hacer renovación indefinida: si caduca, el
// usuario vuelve a conectar. Por eso avisamos de la fecha
// de caducidad.
// ─────────────────────────────────────────────────────

const GRAPH_HOST = "https://graph.instagram.com";
const TOKEN_ENDPOINT = "https://api.instagram.com/oauth/access_token";
const TOKEN_TTL_DAYS = 60;

type GraphResponse = {
  id?: string;
  access_token?: string;
  expires_in?: number;
  data?: unknown[];
  error?: { type?: string; message?: string; code?: number };
  paging?: { next?: string; cursors?: { after?: string } };
};

// ─── Tipos de Media y Comentarios ────────────────────
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

// ─── Convierte un error de la API en mensaje claro ────
export function friendlyMetaError(status: number, body: string): string {
  let message = body.slice(0, 400);
  try {
    const parsed = JSON.parse(body);
    if (parsed?.error?.message) message = parsed.error.message;
    if (parsed?.error?.code === 190) {
      return "El token de Instagram ha caducado. Vuelve a conectar la cuenta desde Configuración.";
    }
    if (parsed?.error?.code === 200) {
      return `Instagram no tiene acceso a esta cuenta: ${parsed.error.message}. Comprueba los permisos de la app y que la cuenta sea Business o Creator.`;
    }
  } catch {
    // no es JSON, usamos el texto tal cual
  }
  return `Instagram API error ${status}: ${message}`;
}

// ─── Convierte un token corto en long-lived (60 días) ──
export async function exchangeForLongLivedToken(
  accessToken: string,
): Promise<{ accessToken: string; expiresAt: Date }> {
  const clientSecret = process.env.META_CLIENT_SECRET!;

  const params = new URLSearchParams({
    grant_type: "ig_exchange_token",
    client_secret: clientSecret,
    access_token: accessToken,
  });
  const res = await fetch(`${GRAPH_HOST}/access_token?${params.toString()}`);

  if (!res.ok) {
    const body = await res.text();
    throw new Error(friendlyMetaError(res.status, body));
  }

  const data = (await res.json()) as GraphResponse;
  if (!data?.access_token) throw new Error("Instagram no devolvió un token long-lived");

  const expiresIn = data.expires_in ?? TOKEN_TTL_DAYS * 86400;
  return {
    accessToken: data.access_token,
    expiresAt: new Date(Date.now() + expiresIn * 1000),
  };
}

// ─── Comprueba si el token está caducado ─────────────
export function isInstagramTokenExpired(expiresAt: Date | null): boolean {
  if (!expiresAt) return true;
  // Avisamos 2 días antes para que el usuario reconecte a tiempo
  return expiresAt.getTime() - 2 * 86400 * 1000 < Date.now();
}

// ─── Obtiene el perfil de la cuenta (username) ───────
export async function getInstagramUserProfile(
  accessToken: string,
  userId: string,
): Promise<InstagramUserProfile> {
  const url = `${GRAPH_HOST}/${userId}?fields=id,username,account_type&access_token=${encodeURIComponent(accessToken)}`;
  const res = await fetch(url);

  if (!res.ok) {
    const body = await res.text();
    throw new Error(friendlyMetaError(res.status, body));
  }

  const data = (await res.json()) as {
    id?: string;
    username?: string;
    account_type?: string;
  };
  return {
    id: data.id ?? userId,
    username: data.username ?? "",
    accountType: (data.account_type ?? "").toUpperCase(),
  };
}

// ─── Obtiene las publicaciones recientes ─────────────
export async function getRecentMedia(
  accessToken: string,
  instagramUserId: string,
  limit = 12,
): Promise<InstagramMedia[]> {
  const media: InstagramMedia[] = [];
  let url = `${GRAPH_HOST}/${instagramUserId}/media?fields=id,caption,timestamp,media_type,permalink,thumbnail_url,media_url,comments_count&limit=${Math.min(limit, 25)}&access_token=${encodeURIComponent(accessToken)}`;

  // Pedimos como mucho 2 páginas (paginación con cursor)
  for (let page = 0; page < 2; page++) {
    const res = await fetch(url);
    if (!res.ok) {
      const body = await res.text();
      throw new Error(friendlyMetaError(res.status, body));
    }
    const data = (await res.json()) as {
      data?: InstagramMedia[];
      paging?: { next?: string };
    };
    if (data?.data) media.push(...data.data);
    if (media.length >= limit || !data?.paging?.next) break;
    url = data.paging.next;
  }

  return media.slice(0, limit);
}

// ─── Obtiene los comentarios de una publicación ──────
export async function getMediaComments(
  accessToken: string,
  mediaId: string,
): Promise<InstagramComment[]> {
  const fields =
    "id,text,timestamp,username,from{id,username},replies{id,text,timestamp,username,from{id,username}}";
  const url = `${GRAPH_HOST}/${mediaId}/comments?fields=${fields}&limit=50&access_token=${encodeURIComponent(accessToken)}`;
  const res = await fetch(url);

  if (!res.ok) {
    const body = await res.text();
    console.error(`[Instagram] Error obteniendo comentarios de ${mediaId}:`, body);
    return [];
  }

  const data = (await res.json()) as {
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

  return (data?.data ?? []).map((c) => ({
    id: c.id,
    text: c.text ?? "",
    timestamp: c.timestamp ?? "",
    username: c.username ?? c.from?.username ?? "Anónimo",
    from_id: c.from?.id,
    replies: (c.replies?.data ?? []).map((r) => ({
      id: r.id,
      text: r.text ?? "",
      timestamp: r.timestamp ?? "",
      username: r.username ?? r.from?.username ?? "Anónimo",
      from_id: r.from?.id,
      replies: [],
    })),
  }));
}

// ─── Obtiene publicaciones + comentarios de las recientes ──
export async function getInstagramCommentsData(
  accessToken: string,
  instagramUserId: string,
  limit = 8,
): Promise<InstagramMediaWithComments[]> {
  const media = await getRecentMedia(accessToken, instagramUserId, limit);

  const withComments = await Promise.all(
    media.map(async (m) => {
      // Solo consultamos comentarios si la publicación tiene alguno
      if ((m.comments_count ?? 0) > 0) {
        const comments = await getMediaComments(accessToken, m.id);
        return { ...m, comments };
      }
      return { ...m, comments: [] };
    }),
  );

  return withComments;
}

// ─── Publica una respuesta a un comentario ───────────
export async function postCommentReply(
  accessToken: string,
  commentId: string,
  message: string,
): Promise<{ ok: boolean; replyId?: string; error?: string }> {
  const safeMessage = message.slice(0, 1000);
  const url = `${GRAPH_HOST}/${commentId}/replies?message=${encodeURIComponent(safeMessage)}&access_token=${encodeURIComponent(accessToken)}`;
  const res = await fetch(url, { method: "POST" });

  if (!res.ok) {
    const body = await res.text();
    return { ok: false, error: friendlyMetaError(res.status, body) };
  }

  const data = (await res.json()) as { id?: string };
  return { ok: true, replyId: data.id };
}