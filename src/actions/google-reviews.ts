'use server';

import prisma from '@/lib/db';
import { createClient } from '@/lib/supabase/server';
import { extractPlaceId, fetchPlaceDetails, type GoogleReview } from '@/lib/google-places';

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

  const placeId = extractPlaceId(business.googleLink);
  if (!placeId) return null;

  return fetchPlaceDetails(placeId);
};

export const getAllGoogleReviews = async () => {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const userId = session?.user?.id ?? '';
  if (!userId) throw new Error('No autenticado');

  if (!process.env.GOOGLE_MAPS_API_KEY) {
    throw new Error('Falta GOOGLE_MAPS_API_KEY en .env.local');
  }

  const businesses = await prisma.business.findMany({
    where: { userId, googleLink: { not: null } },
    select: { id: true, name: true, googleLink: true },
  });

  if (businesses.length === 0) return [];

  const results = await Promise.allSettled(
    businesses.map(async (b) => {
      if (!b.googleLink) return null;
      const placeId = extractPlaceId(b.googleLink);
      if (!placeId) return null;
      const details = await fetchPlaceDetails(placeId);
      if (!details) return null;
      return { businessId: b.id, businessName: b.name, ...details };
    }),
  );

  const fulfilled = results
    .filter(
      (r): r is PromiseFulfilledResult<{ businessId: string; businessName: string; name: string; rating: number; userRatingsTotal: number; reviews: GoogleReview[] }> =>
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
