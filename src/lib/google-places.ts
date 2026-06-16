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

    // Format 5: google.com/maps/place/Name/@lat,lng,data=!3m...!1s...!16s/place_id!8m2...
    // The !16s value is the real Google place_id (e.g. /g/11t6_7v1vn or ChIJ...)
    const data = u.searchParams.get('data') || u.pathname.match(/\/data=([^?]+)/)?.[1];
    if (data) {
      const p16 = data.match(/!16s([^!]+)/)?.[1];
      if (p16 && !/^\d+$/.test(p16)) return p16;
      // Fallback: extract CID from !1s (second hex number)
      const cidHex = data.match(/!1s0x[0-9a-f]+:0x([0-9a-f]+)/)?.[1];
      if (cidHex) return BigInt(`0x${cidHex}`).toString();
    }

    return null;
  } catch {
    return null;
  }
}

async function resolvePlaceId(placeId: string, queryName?: string): Promise<string> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY!;
  // If it's a numeric CID, use Text Search to find the actual place_id
  if (/^\d+$/.test(placeId) && queryName) {
    const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(queryName)}&key=${apiKey}`;
    const res = await fetch(searchUrl);
    if (res.ok) {
      const data = await res.json();
      if (data.status === 'OK' && data.results?.length > 0) {
        return data.results[0].place_id;
      }
    }
  }
  return placeId;
}

export async function fetchPlaceDetails(
  placeId: string,
  queryName?: string,
): Promise<PlaceDetails | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) throw new Error('Falta GOOGLE_MAPS_API_KEY en .env.local');

  const resolved = await resolvePlaceId(placeId, queryName);
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(resolved)}&fields=name,rating,user_ratings_total,reviews&language=es&key=${apiKey}`;

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
