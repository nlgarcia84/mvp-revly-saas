// ─── Google Business Profile API ─────────────────────
// Esta API permite obtener TODAS las reseñas de un
// negocio (no solo 5 como con Places API). Para usarla,
// el dueño del negocio debe:
//   1. Tener su perfil de Google Business Profile verificado
//   2. Conectar su cuenta de Google desde Settings
//   3. Autorizar el acceso vía OAuth
//
// Cuando está conectado, las reseñas se obtienen desde
// aquí. Si no, el sistema usa Google Places API (5 reseñas).
// ─────────────────────────────────────────────────────

export type BusinessProfileReview = {
  authorName: string;
  rating: number;
  text: string;
  time: number;
  profilePhotoUrl: string;
  relativeTimeDescription: string;
  hasReply: boolean;
  reviewId?: string;
};

export type BusinessProfileData = {
  name: string;
  rating: number;
  userRatingsTotal: number;
  reviews: BusinessProfileReview[];
};

// ─── Renueva el token de acceso cuando caduca ────────
// El token de acceso de OAuth solo dura 1 hora. Google
// nos da un "refresh token" para renovarlo sin que el
// usuario tenga que volver a autorizar.
// ─────────────────────────────────────────────────────
export async function refreshAccessToken(
  refreshToken: string,
): Promise<{ accessToken: string; expiresAt: Date } | null> {
  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
  const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!res.ok) {
    console.error('[BusinessProfile] Error renovando token:', await res.text());
    return null;
  }

  const data = await res.json();
  const expiresAt = new Date(Date.now() + (data.expires_in ?? 3600) * 1000);
  return { accessToken: data.access_token, expiresAt };
}

// ─── Obtiene las cuentas de Business Profile ─────────
// Cada usuario de Google puede tener una o varias
// cuentas de Business Profile. Normalmente es solo una.
// ─────────────────────────────────────────────────────
export async function getBusinessAccounts(accessToken: string) {
  const res = await fetch(
    'https://mybusinessbusinessinformation.googleapis.com/v1/accounts',
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (!res.ok) {
    console.error('[BusinessProfile] Error listando cuentas:', await res.text());
    return [];
  }

  const data = await res.json();
  return data.accounts ?? [];
}

// ─── Obtiene las ubicaciones (locales) de una cuenta ──
// Cada cuenta puede tener varios negocios/ubicaciones.
// Normalmente es una por dirección física.
// ─────────────────────────────────────────────────────
export async function getBusinessLocations(
  accessToken: string,
  accountId: string,
) {
  const res = await fetch(
    `https://mybusinessbusinessinformation.googleapis.com/v1/accounts/${accountId}/locations?pageSize=100`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (!res.ok) {
    console.error('[BusinessProfile] Error listando ubicaciones:', await res.text());
    return [];
  }

  const data = await res.json();
  return data.locations ?? [];
}

// ─── Convierte la estrella de Google a número ────────
// Google devuelve "FOUR" en vez de 4. Esta función lo
// pasa a número.
// ─────────────────────────────────────────────────────
function starRatingToNumber(rating: string): number {
  const map: Record<string, number> = {
    ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5,
  };
  return map[rating] ?? 0;
}

// ─── Obtiene TODAS las reseñas de una ubicación ──────
// Google Business Profile API devuelve todas las reseñas
// con paginación (nextPageToken). Vamos pidiendo páginas
// hasta que no haya más.
// ─────────────────────────────────────────────────────
export async function getBusinessReviews(
  accessToken: string,
  accountId: string,
  locationId: string,
): Promise<BusinessProfileReview[]> {
  const reviews: BusinessProfileReview[] = [];
  let pageToken: string | undefined;

  do {
    let url = `https://mybusiness.googleapis.com/v1/accounts/${accountId}/locations/${locationId}/reviews?pageSize=50`;
    if (pageToken) url += `&pageToken=${pageToken}`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      console.error('[BusinessProfile] Error obteniendo reseñas:', await res.text());
      break;
    }

    const data = await res.json();

    if (data.reviews) {
      for (const r of data.reviews) {
        reviews.push({
          authorName: r.reviewer?.displayName ?? 'Anónimo',
          rating: starRatingToNumber(r.starRating),
          text: r.comment ?? '',
          time: Math.floor(new Date(r.createTime).getTime() / 1000),
          profilePhotoUrl: r.reviewer?.profilePhotoUrl ?? '',
          relativeTimeDescription: calcularTiempoRelativo(r.createTime),
          hasReply: !!r.reviewReply,
          reviewId: r.reviewId ?? undefined,
        });
      }
    }

    pageToken = data.nextPageToken;
  } while (pageToken);

  return reviews;
}

// ─── Calcula el tiempo relativo desde una fecha ──────
// Convierte "2024-03-15T10:30:00Z" en "hace 3 meses".
// ─────────────────────────────────────────────────────
function calcularTiempoRelativo(isoDate: string): string {
  const ahora = Date.now();
  const fecha = new Date(isoDate).getTime();
  const diffMs = ahora - fecha;
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return 'hace unos segundos';
  if (diffMin < 60) return `hace ${diffMin} min`;

  const diffHoras = Math.floor(diffMin / 60);
  if (diffHoras < 24) return `hace ${diffHoras} h`;

  const diffDias = Math.floor(diffHoras / 24);
  if (diffDias < 30) return `hace ${diffDias} días`;

  const diffMeses = Math.floor(diffDias / 30);
  if (diffMeses < 12) return `hace ${diffMeses} meses`;

  const diffAños = Math.floor(diffMeses / 12);
  return `hace ${diffAños} años`;
}

// ─── Obtiene datos completos del negocio + reseñas ───
// Función principal: dado un access token válido y los
// IDs de cuenta/ubicación, devuelve nombre, rating y
// todas las reseñas.
// ─────────────────────────────────────────────────────
export async function getBusinessProfileData(
  accessToken: string,
  accountId: string,
  locationId: string,
): Promise<BusinessProfileData | null> {
  // Primero obtener datos de la ubicación (nombre, rating)
  const locRes = await fetch(
    `https://mybusinessbusinessinformation.googleapis.com/v1/accounts/${accountId}/locations/${locationId}?readMask=title,rating`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (!locRes.ok) {
    console.error('[BusinessProfile] Error obteniendo datos de ubicación:', await locRes.text());
    return null;
  }

  const location = await locRes.json();

  // Luego obtener todas las reseñas
  const reviews = await getBusinessReviews(accessToken, accountId, locationId);

  // Google a veces devuelve el rating como objeto { averageRating: 4.2 }
  const rating = location.rating?.averageRating ?? 0;

  return {
    name: location.title ?? '',
    rating,
    userRatingsTotal: reviews.length,
    reviews,
  };
}
