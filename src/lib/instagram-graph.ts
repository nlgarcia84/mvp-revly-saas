// ─── Instagram Graph API (Meta) ─────────────────────
// Esta API permite leer las publicaciones de una cuenta
// profesional de Instagram (Business o Creator) y sus
// comentarios, además de responderlos. Para usarla, el
// negocio debe:
//   1. Tener una cuenta de Instagram Business o Creator
//   2. Vincularla a una página de Facebook (permisos:
//      instagram_basic, instagram_manage_comments,
//      pages_show_list, pages_read_engagement)
//   3. Conectar su cuenta desde Settings vía Facebook Login
//
// El token long-lived dura 60 días. A diferencia de Google,
// Meta NO permite renovarlo con un refresh token: si caduca,
// el usuario vuelve a conectar. Por eso avisamos de la fecha
// de caducidad y devolvemos un error claro si ya expiró.
// ─────────────────────────────────────────────────────

const HOST = "https://graph.facebook.com/v21.0";
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

// ─── Convierte un error de la Graph API en mensaje claro ──
export function friendlyMetaError(status: number, body: string): string {
  let message = body.slice(0, 400);
  try {
    const parsed = JSON.parse(body);
    if (parsed?.error?.message) message = parsed.error.message;
    if (parsed?.error?.code === 190) {
      return "El token de Instagram ha caducado. Vuelve a conectar la cuenta desde Configuración.";
    }
    if (parsed?.error?.code === 200) {
      return `Meta no tiene acceso a esta cuenta: ${parsed.error.message}. Revisa los permisos de la app (App Review) o que la cuenta sea Business/Creator vinculada a una página de Facebook.`;
    }
  } catch {
    // no es JSON, usamos el texto tal cual
  }
  return `Meta Graph API error ${status}: ${message}`;
}

// ─── Extiende un token corto a long-lived ────────────
// Tras el OAuth de Facebook Login obtenemos un token que
// solo dura ~2 horas. Con fb_exchange_token lo cambiamos
// por uno de 60 días usando App ID + Secret (server-side).
// ─────────────────────────────────────────────────────
export async function exchangeForLongLivedToken(
  accessToken: string,
): Promise<{ accessToken: string; expiresAt: Date }> {
  const APP_ID = process.env.META_CLIENT_ID!;
  const APP_SECRET = process.env.META_CLIENT_SECRET!;

  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: APP_ID,
    client_secret: APP_SECRET,
    fb_exchange_token: accessToken,
  });
  const url = `${HOST}/oauth/access_token?${params.toString()}`;
  const res = await fetch(url);

  if (!res.ok) {
    const body = await res.text();
    throw new Error(friendlyMetaError(res.status, body));
  }

  const data = (await res.json()) as GraphResponse;
  if (!data?.access_token) throw new Error("Meta no devolvió un token long-lived");

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

// ─── Obtiene la cuenta de Business de Instagram ──────
// A partir del ID de la página de Facebook obtenemos el
// ID de la cuenta profesional de Instagram asociada.
// ─────────────────────────────────────────────────────
export async function getInstagramBusinessData(
  accessToken: string,
  pageId: string,
): Promise<{ instagramId: string; pageName: string } | null> {
  const url = `${HOST}/${pageId}?fields=id,name,instagram_business_account&access_token=${encodeURIComponent(accessToken)}`;
  const res = await fetch(url);

  if (!res.ok) {
    const body = await res.text();
    console.error("[Instagram] Error obteniendo cuenta de negocio:", body);
    throw new Error(friendlyMetaError(res.status, body));
  }

  const data = (await res.json()) as GraphResponse & {
    name?: string;
    instagram_business_account?: { id?: string };
  };
  if (!data?.instagram_business_account?.id) {
    throw new Error(
      "La página de Facebook vinculada no tiene una cuenta profesional de Instagram asociada. Comprueba que la cuenta sea Business o Creator.",
    );
  }

  return {
    instagramId: data.instagram_business_account.id,
    pageName: data.name ?? "",
  };
}

// ─── Obtiene las publicaciones recientes ─────────────
export async function getRecentMedia(
  accessToken: string,
  instagramUserId: string,
  limit = 12,
): Promise<InstagramMedia[]> {
  const media: InstagramMedia[] = [];
  let url = `${HOST}/${instagramUserId}/media?fields=id,caption,timestamp,media_type,permalink,thumbnail_url,media_url,comments_count&limit=${Math.min(limit, 25)}&access_token=${encodeURIComponent(accessToken)}`;

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
// Devuelve solo comentarios de nivel superior y sus
// respuestas (replies). Máximo 50 comentarios por llamada.
// ─────────────────────────────────────────────────────
export async function getMediaComments(
  accessToken: string,
  mediaId: string,
): Promise<InstagramComment[]> {
  const fields =
    "id,text,timestamp,username,from{id,username},replies{id,text,timestamp,username,from{id,username}}";
  const url = `${HOST}/${mediaId}/comments?fields=${fields}&limit=50&access_token=${encodeURIComponent(accessToken)}`;
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
// POST /{comment-id}/replies?message=... — es lo que usa
// la app "Responder con IA" para contestar directamente.
// ─────────────────────────────────────────────────────
export async function postCommentReply(
  accessToken: string,
  commentId: string,
  message: string,
): Promise<{ ok: boolean; replyId?: string; error?: string }> {
  const safeMessage = message.slice(0, 1000);
  const url = `${HOST}/${commentId}/replies?message=${encodeURIComponent(safeMessage)}&access_token=${encodeURIComponent(accessToken)}`;
  const res = await fetch(url, { method: "POST" });

  if (!res.ok) {
    const body = await res.text();
    return { ok: false, error: friendlyMetaError(res.status, body) };
  }

  const data = (await res.json()) as { id?: string };
  return { ok: true, replyId: data.id };
}