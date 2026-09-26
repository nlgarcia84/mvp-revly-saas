'use server';

import prisma from '@/lib/db';
import { createClient } from '@/lib/supabase/server';
import {
  extractPlaceId,
  fetchPlaceDetails,
  resolveShortUrl,
  resolveWithTextSearch,
  type GoogleReview,
} from '@/lib/google-places';
import {
  refreshAccessToken,
  getBusinessProfileData,
  replyToBusinessReview,
} from '@/lib/google-business-profile';

// Devuelve el id del usuario autenticado o lanza si no hay sesión.
async function requireUserId(): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');
  return user.id;
}

// Devuelve un access token válido de Google Business Profile, renovándolo
// con el refresh token si ha caducado. Null si no hay conexión.
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

  // Si aún no ha caducado, lo devolvemos tal cual.
  if (
    business.googleBusinessTokenExpiry &&
    business.googleBusinessTokenExpiry > new Date()
  ) {
    return business.googleBusinessAccessToken;
  }

  // Caducado: lo renovamos y guardamos el nuevo.
  const refreshedToken = await refreshAccessToken(
    business.googleBusinessRefreshToken,
  );
  if (!refreshedToken) return null;

  await prisma.business.update({
    where: { id: businessId },
    data: {
      googleBusinessAccessToken: refreshedToken.accessToken,
      googleBusinessTokenExpiry: refreshedToken.expiresAt,
    },
  });

  return refreshedToken.accessToken;
}

// Obtiene las reseñas de un negocio. Intenta primero Business Profile API
// (todas las reseñas); si no está conectado o falla, usa Places API (5).
export const getBusinessGoogleReviews = async (businessId: string) => {
  const userId = await requireUserId();

  const business = await prisma.business.findFirst({
    where: { id: businessId, userId },
  });
  if (!business) throw new Error('Negocio no encontrado');
  if (!business.googleLink) return null;

  // 1) Business Profile API (si hay conexión y tokens válidos).
  const accessToken = await getValidAccessToken(businessId);
  if (
    accessToken &&
    business.googleBusinessAccountId &&
    business.googleBusinessLocationId
  ) {
    try {
      const businessProfile = await getBusinessProfileData(
        accessToken,
        business.googleBusinessAccountId,
        business.googleBusinessLocationId,
      );
      if (businessProfile) {
        const resolvedUrl = await resolveShortUrl(business.googleLink);
        const placeId = extractPlaceId(resolvedUrl) ?? '';
        return {
          placeId,
          name: businessProfile.name,
          rating: businessProfile.rating,
          userRatingsTotal: businessProfile.userRatingsTotal,
          reviews: businessProfile.reviews,
        };
      }
    } catch (error) {
      // Si la API falla (quota, región, etc.), seguimos con el fallback.
      console.error(
        '[GoogleReviews] Business Profile API falló, usando fallback:',
        error,
      );
    }
  }

  // 2) Fallback: Places API (solo las 5 últimas reseñas).
  const resolvedUrl = await resolveShortUrl(business.googleLink);
  let placeId = extractPlaceId(resolvedUrl);
  // Enlaces tipo "share.google" no traen Place ID: buscamos por nombre.
  if (!placeId) {
    placeId = (await resolveWithTextSearch(business.name, resolvedUrl)) ?? '';
  }
  if (!placeId) {
    console.error(
      `[GoogleReviews] No se pudo extraer Place ID del enlace: ${business.googleLink} (resuelto: ${resolvedUrl})`,
    );
    return null;
  }

  const details = await fetchPlaceDetails(placeId, business.name, resolvedUrl);
  if (!details) {
    console.error(
      `[GoogleReviews] fetchPlaceDetails devolvió null | placeId: ${placeId} | negocio: ${business.name} | enlace: ${resolvedUrl}`,
    );
    return null;
  }
  return { ...details, placeId };
};

// Estado de la conexión con Business Profile, para mostrar en Settings.
export const getBusinessProfileStatus = async (businessId: string) => {
  const userId = await requireUserId();

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

// Publica una respuesta en Google. Requiere Business Profile conectado y
// cuota aprobada. `reviewName` solo existe en reseñas de Business Profile.
export const replyToGoogleReview = async (
  businessId: string,
  reviewName: string,
  comment: string,
): Promise<{ ok: boolean; error?: string }> => {
  const userId = await requireUserId();

  if (!reviewName || !comment.trim()) {
    return { ok: false, error: 'Faltan datos para publicar la respuesta.' };
  }

  const business = await prisma.business.findFirst({
    where: { id: businessId, userId },
    select: {
      googleBusinessAccountId: true,
      googleBusinessLocationId: true,
    },
  });
  if (!business) throw new Error('Negocio no encontrado');
  if (!business.googleBusinessAccountId || !business.googleBusinessLocationId) {
    return {
      ok: false,
      error: 'El negocio no está conectado a Google Business Profile.',
    };
  }

  const accessToken = await getValidAccessToken(businessId);
  if (!accessToken) {
    return {
      ok: false,
      error: 'No hay una conexión válida con Google. Vuelve a conectar la cuenta.',
    };
  }

  return replyToBusinessReview(accessToken, reviewName, comment.trim());
};

// Devuelve las reseñas de todos los negocios del usuario.
export const getAllGoogleReviews = async () => {
  const userId = await requireUserId();

  const businesses = await prisma.business.findMany({
    where: { userId, googleLink: { not: null } },
    select: { id: true, name: true, googleLink: true },
  });
  if (businesses.length === 0) return [];

  const results = await Promise.allSettled(
    businesses.map(async (business) => {
      const data = await getBusinessGoogleReviews(business.id);
      if (!data) return null;
      return { businessId: business.id, businessName: business.name, ...data };
    }),
  );

  const reviews = results
    .filter(
      (
        result,
      ): result is PromiseFulfilledResult<{
        businessId: string;
        businessName: string;
        name: string;
        rating: number;
        userRatingsTotal: number;
        placeId: string;
        reviews: GoogleReview[];
      }> => result.status === 'fulfilled' && result.value !== null,
    )
    .map((result) => result.value);

  const errors = results.filter(
    (result): result is PromiseRejectedResult => result.status === 'rejected',
  );

  if (reviews.length === 0 && errors.length > 0) {
    throw errors[0].reason;
  }

  return reviews;
};
