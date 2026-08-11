'use server';

import prisma from '@/lib/db';
import { createClient } from '@/lib/supabase/server';
import { extractPlaceId, fetchPlaceDetails, resolveShortUrl, type GoogleReview } from '@/lib/google-places';
import { refreshAccessToken, getBusinessProfileData } from '@/lib/google-business-profile';

// ─── Obtiene un access token válido ───────────────────
// Si el token actual ha caducado, usa el refresh token
// para renovarlo y guarda el nuevo en la BD.
// ─────────────────────────────────────────────────────
async function getValidAccessToken(businessId: string): Promise<string | null> {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: {
      googleBusinessAccessToken: true,
      googleBusinessRefreshToken: true,
      googleBusinessTokenExpiry: true,
      googleBusinessAccountId: true,
      googleBusinessLocationId: true,
    },
  });

  if (!business?.googleBusinessAccessToken || !business.googleBusinessRefreshToken) {
    return null;
  }

  // Si el token aún no ha caducado, lo devolvemos tal cual
  if (
    business.googleBusinessTokenExpiry &&
    business.googleBusinessTokenExpiry > new Date()
  ) {
    return business.googleBusinessAccessToken;
  }

  // Ha caducado, lo renovamos con el refresh token
  const nuevo = await refreshAccessToken(business.googleBusinessRefreshToken);
  if (!nuevo) return null;

  // Guardamos el nuevo token en la BD
  await prisma.business.update({
    where: { id: businessId },
    data: {
      googleBusinessAccessToken: nuevo.accessToken,
      googleBusinessTokenExpiry: nuevo.expiresAt,
    },
  });

  return nuevo.accessToken;
}

// ─── Obtiene reseñas de Google ────────────────────────
// Primero intenta con Business Profile API (todas las
// reseñas). Si no está conectado o falla, usa Places API
// (solo 5 reseñas). Así el usuario siempre ve algo.
// ─────────────────────────────────────────────────────
export const getBusinessGoogleReviews = async (businessId: string) => {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const userId = session?.user?.id ?? '';
  if (!userId) throw new Error('No autenticado');

  const business = await prisma.business.findFirst({
    where: { id: businessId, userId },
  });
  if (!business) throw new Error('Negocio no encontrado');
  if (!business.googleLink) return null;

  // ── 1. Intentar con Business Profile API ────────────
  // Si el usuario ha conectado su cuenta y tiene tokens
  // válidos, usamos la API profesional que devuelve
  // todas las reseñas (sin límite de 5).
  // ────────────────────────────────────────────────────
  const accessToken = await getValidAccessToken(businessId);
  if (accessToken && business.googleBusinessAccountId && business.googleBusinessLocationId) {
    try {
      const bpData = await getBusinessProfileData(
        accessToken,
        business.googleBusinessAccountId,
        business.googleBusinessLocationId,
      );
      if (bpData) {
        // Extraemos el Place ID del enlace de Google para ponerlo en la respuesta
        const resolvedUrl = await resolveShortUrl(business.googleLink);
        const placeId = extractPlaceId(resolvedUrl) ?? '';

        return {
          placeId,
          name: bpData.name,
          rating: bpData.rating,
          userRatingsTotal: bpData.userRatingsTotal,
          reviews: bpData.reviews,
        };
      }
    } catch (e) {
      console.error('[GoogleReviews] Business Profile API falló:', e);
      throw new Error(
        `Google Business Profile API: ${e instanceof Error ? e.message : 'Error desconocido'}`,
      );
    }
  }

  // ── 2. Fallback: Google Places API (solo 5 reseñas) ─
  // Si no está conectado a Business Profile o si la API
  // falló, usamos Places API que es más simple pero solo
  // devuelve las últimas 5 reseñas.
  // ────────────────────────────────────────────────────
  const resolvedUrl = await resolveShortUrl(business.googleLink);
  const placeId = extractPlaceId(resolvedUrl);
  if (!placeId) {
    console.error(`[GoogleReviews] No se pudo extraer Place ID del enlace: ${business.googleLink} (resuelto: ${resolvedUrl})`);
    return null;
  }

  const details = await fetchPlaceDetails(placeId, business.name, resolvedUrl);
  if (!details) {
    console.error(`[GoogleReviews] fetchPlaceDetails devolvió null | placeId: ${placeId} | negocio: ${business.name} | enlace: ${resolvedUrl}`);
    return null;
  }
  return { ...details, placeId };
};

// ─── Estado de la conexión con Business Profile ──────
// Para mostrar en Settings si está conectado o no.
// Devuelve la información de la cuenta conectada.
// ─────────────────────────────────────────────────────
export const getBusinessProfileStatus = async (businessId: string) => {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const userId = session?.user?.id ?? '';
  if (!userId) throw new Error('No autenticado');

  const business = await prisma.business.findFirst({
    where: { id: businessId, userId },
    select: {
      googleBusinessAccessToken: true,
      googleBusinessAccountId: true,
      googleBusinessLocationId: true,
    },
  });

  if (!business?.googleBusinessAccessToken) {
    return { connected: false };
  }

  return {
    connected: true,
    accountId: business.googleBusinessAccountId,
    locationId: business.googleBusinessLocationId,
  };
};

export const getAllGoogleReviews = async () => {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const userId = session?.user?.id ?? '';
  if (!userId) throw new Error('No autenticado');

  const businesses = await prisma.business.findMany({
    where: { userId, googleLink: { not: null } },
    select: { id: true, name: true, googleLink: true },
  });

  if (businesses.length === 0) return [];

  const results = await Promise.allSettled(
    businesses.map(async (b) => {
      const data = await getBusinessGoogleReviews(b.id);
      if (!data) return null;
      return { businessId: b.id, businessName: b.name, ...data };
    }),
  );

  const fulfilled = results
    .filter(
      (r): r is PromiseFulfilledResult<{ businessId: string; businessName: string; name: string; rating: number; userRatingsTotal: number; placeId: string; reviews: GoogleReview[] }> =>
        r.status === 'fulfilled' && r.value !== null,
    )
    .map((r) => r.value);

  const errors = results.filter(
    (r): r is PromiseRejectedResult => r.status === 'rejected',
  );

  if (fulfilled.length === 0 && errors.length > 0) {
    throw errors[0].reason;
  }

  return fulfilled;
};
