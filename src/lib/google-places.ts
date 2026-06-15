export type GoogleReview = {
  authorName: string;
  rating: number;
  text: string;
  time: number;
  profilePhotoUrl: string;
  relativeTimeDescription: string;
};

export type PlaceDetails = {
  name: string;
  rating: number;
  userRatingsTotal: number;
  reviews: GoogleReview[];
};

export function extractPlaceId(url: string): string | null {
  try {
    const u = new URL(url);

    // Format 1: search.google.com/local/writereview?placeid=ChIJ...
    const placeid = u.searchParams.get('placeid') || u.searchParams.get('place_id');
    if (placeid) return placeid;

    // Format 2: google.com/maps/place/?q=place_id:ChIJ...
    const q = u.searchParams.get('q');
    if (q?.startsWith('place_id:')) return q.slice(9);

    // Format 3: google.com/maps?cid=...
    const cid = u.searchParams.get('cid');
    if (cid) return cid;

    // Format 4: /maps/place/SomePlace/@data=... or /maps?ftid=...
    const ftid = u.searchParams.get('ftid');
    if (ftid) return ftid;

    return null;
  } catch {
    return null;
  }
}

export async function fetchPlaceDetails(
  placeId: string,
): Promise<PlaceDetails | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) throw new Error('Falta GOOGLE_MAPS_API_KEY en .env.local');

  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=name,rating,user_ratings_total,reviews&language=es&key=${apiKey}`;

  const res = await fetch(url);
  if (!res.ok) return null;

  const data = await res.json();
  if (data.status === 'REQUEST_DENIED') {
    throw new Error(`Google Places API: ${data.error_message ?? 'acceso denegado'}`);
  }
  if (data.status === 'OVER_QUERY_LIMIT') {
    throw new Error('Google Places API: límite de consultas excedido');
  }
  if (data.status === 'INVALID_REQUEST') {
    throw new Error(`Google Places API: solicitud inválida - ${data.error_message ?? ''}`);
  }
  if (data.status !== 'OK' || !data.result) return null;

  const result = data.result;
  return {
    name: result.name ?? '',
    rating: result.rating ?? 0,
    userRatingsTotal: result.user_ratings_total ?? 0,
    reviews: (result.reviews ?? []).map((r: any) => ({
      authorName: r.author_name ?? '',
      rating: r.rating ?? 0,
      text: r.text ?? '',
      time: r.time ?? 0,
      profilePhotoUrl: r.profile_photo_url ?? '',
      relativeTimeDescription: r.relative_time_description ?? '',
    })),
  };
}
