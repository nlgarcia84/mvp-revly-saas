// Google Business Profile API: permite obtener TODAS las reseñas de un negocio
// (no solo 5 como Places API). Requiere que el dueño tenga su perfil verificado,
// conecte su cuenta desde Settings y autorice vía OAuth. Si no, se usa Places API.

export type BusinessProfileReview = {
  authorName: string;
  rating: number;
  text: string;
  time: number;
  profilePhotoUrl: string;
  relativeTimeDescription: string;
  hasReply: boolean;
  reviewId?: string;
  // Nombre completo del recurso: "accounts/{account}/locations/{location}/reviews/{reviewId}".
  // Es lo que necesita el endpoint de respuesta (reply).
  reviewName?: string;
};

export type BusinessProfileData = {
  name: string;
  rating: number;
  userRatingsTotal: number;
  reviews: BusinessProfileReview[];
};

// Formulario oficial para pedir acceso a la GBP API.
const GBP_ACCESS_FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSfC_FKSWzbSae_5rOpgwFeIUzXUF1JCQnlsZM_gC1I2UHjA3w/viewform";

// Convierte un error de la API en un mensaje accionable. Cuando el proyecto no
// está aprobado por Google, llegan 403 con SERVICE_DISABLED/AUTH_PERMISSION_DENIED.
export function friendlyBusinessProfileError(
  status: number,
  body: string,
): string {
  const isDisabled =
    /SERVICE_DISABLED|not been used in project|is disabled|AUTH_PERMISSION_DENIED/.test(
      body,
    );
  if (isDisabled) {
    return `Google aún no ha habilitado la My Business API para tu proyecto. Solicita el acceso en el formulario oficial (${GBP_ACCESS_FORM_URL}) y, tras la aprobación (quota 300 QPM), vuelve a conectar la cuenta.`;
  }
  const detail = body.slice(0, 500);
  return `No se pudo acceder a Google Business Profile (${status}). ${detail}`;
}

// Renueva el access token de OAuth (dura 1 hora) usando el refresh token.
export async function refreshAccessToken(
  refreshToken: string,
): Promise<{ accessToken: string; expiresAt: Date } | null> {
  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
  const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    console.error(
      `[BusinessProfile] Error renovando token | HTTP ${response.status}`,
    );
    return null;
  }

  const payload = await response.json();
  const expiresAt = new Date(Date.now() + (payload.expires_in ?? 3600) * 1000);
  return { accessToken: payload.access_token, expiresAt };
}

// Lista las cuentas de Business Profile del usuario. El listado vive en la
// Account Management API, no en la Business Information API.
export async function getBusinessAccounts(accessToken: string) {
  const response = await fetch(
    "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (!response.ok) {
    const body = await response.text();
    console.error("[BusinessProfile] Error listando cuentas:", body);
    return {
      accounts: [],
      error: friendlyBusinessProfileError(response.status, body),
    };
  }

  const payload = await response.json();
  return { accounts: payload.accounts ?? [] };
}

// Lista las ubicaciones (locales) de una cuenta.
export async function getBusinessLocations(
  accessToken: string,
  accountId: string,
) {
  // Se acepta "accounts/123", "123" o el comodín "-" (todas las cuentas).
  const normalizedAccountId = accountId.replace(/^accounts\//, "");
  const url = `https://mybusinessbusinessinformation.googleapis.com/v1/accounts/${normalizedAccountId}/locations?pageSize=100&readMask=name,title`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const body = await response.text();
    console.error(
      `[BusinessProfile] Error listando ubicaciones | HTTP ${response.status} | URL: ${url} | ${body}`,
    );
    return {
      locations: [],
      error: friendlyBusinessProfileError(response.status, body),
    };
  }

  const payload = await response.json();
  return { locations: payload.locations ?? [] };
}

// Google devuelve "FOUR" en vez de 4; lo pasamos a número.
function starRatingToNumber(rating: string): number {
  const map: Record<string, number> = {
    ONE: 1,
    TWO: 2,
    THREE: 3,
    FOUR: 4,
    FIVE: 5,
  };
  return map[rating] ?? 0;
}

export type BusinessReviewsResult = {
  reviews: BusinessProfileReview[];
  averageRating: number;
  totalReviewCount: number;
};

// Obtiene TODAS las reseñas de una ubicación, paginando con nextPageToken.
export async function getBusinessReviews(
  accessToken: string,
  accountId: string,
  locationId: string,
): Promise<BusinessReviewsResult> {
  const reviews: BusinessProfileReview[] = [];
  let pageToken: string | undefined;
  let averageRating = 0;
  let totalReviewCount = 0;

  do {
    let url = `https://mybusiness.googleapis.com/v4/${locationId}/reviews?pageSize=50`;
    if (pageToken) url += `&pageToken=${pageToken}`;

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(
        `[BusinessProfile] Error obteniendo reseñas | HTTP ${response.status} | URL: ${url} | ${body}`,
      );
      throw new Error(friendlyBusinessProfileError(response.status, body));
    }

    const payload = await response.json();

    if (typeof payload.averageRating === "number") {
      averageRating = payload.averageRating;
    }
    if (typeof payload.totalReviewCount === "number") {
      totalReviewCount = payload.totalReviewCount;
    }

    if (payload.reviews) {
      for (const review of payload.reviews) {
        reviews.push({
          authorName: review.reviewer?.displayName ?? "Anónimo",
          rating: starRatingToNumber(review.starRating),
          text: review.comment ?? "",
          time: Math.floor(new Date(review.createTime).getTime() / 1000),
          profilePhotoUrl: review.reviewer?.profilePhotoUrl ?? "",
          relativeTimeDescription: formatRelativeTime(review.createTime),
          hasReply: !!review.reviewReply,
          reviewId: review.reviewId ?? undefined,
          reviewName: review.name ?? undefined,
        });
      }
    }

    pageToken = payload.nextPageToken;
  } while (pageToken);

  return { reviews, averageRating, totalReviewCount };
}

// Convierte "2024-03-15T10:30:00Z" en "hace 3 meses".
function formatRelativeTime(isoDate: string): string {
  const now = Date.now();
  const date = new Date(isoDate).getTime();
  const diffMinutes = Math.floor((now - date) / 60000);

  if (diffMinutes < 1) return "hace unos segundos";
  if (diffMinutes < 60) return `hace ${diffMinutes} min`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `hace ${diffHours} h`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `hace ${diffDays} días`;

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `hace ${diffMonths} meses`;

  const diffYears = Math.floor(diffMonths / 12);
  return `hace ${diffYears} años`;
}

// Función principal: devuelve nombre, rating y todas las reseñas de un negocio.
export async function getBusinessProfileData(
  accessToken: string,
  accountId: string,
  locationId: string,
): Promise<BusinessProfileData | null> {
  // Un local se consulta por su ID en /locations/{locationId} (Business Information v1).
  const numericLocationId =
    locationId.match(/locations\/([^/]+)$/)?.[1] ?? locationId;
  const locationUrl = `https://mybusinessbusinessinformation.googleapis.com/v1/locations/${numericLocationId}?readMask=title`;
  const locationResponse = await fetch(locationUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!locationResponse.ok) {
    const locationBody = await locationResponse.text();
    console.error(
      `[BusinessProfile] Error obteniendo datos de ubicación | HTTP ${locationResponse.status} | URL: ${locationUrl} | ${locationBody}`,
    );
    throw new Error(
      `Google Business Profile: error ${locationResponse.status} al obtener ubicación`,
    );
  }

  const locationData = await locationResponse.json();

  const { reviews, averageRating, totalReviewCount } = await getBusinessReviews(
    accessToken,
    accountId,
    locationId,
  );

  return {
    name: locationData.title ?? "",
    rating: averageRating,
    userRatingsTotal: totalReviewCount > 0 ? totalReviewCount : reviews.length,
    reviews,
  };
}

// Publica una respuesta a una reseña. `reviewName` es el nombre completo del
// recurso. Requiere que Google haya aprobado la cuota (si no, responde 429/403).
export async function replyToBusinessReview(
  accessToken: string,
  reviewName: string,
  comment: string,
): Promise<{ ok: boolean; error?: string }> {
  const url = `https://mybusiness.googleapis.com/v4/${reviewName}/reply`;

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ comment }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error(
      `[BusinessProfile] Error publicando respuesta | HTTP ${response.status} | URL: ${url} | ${body}`,
    );
    return { ok: false, error: friendlyBusinessProfileError(response.status, body) };
  }

  return { ok: true };
}
