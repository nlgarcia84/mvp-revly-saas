export type GoogleReview = {
  authorName: string;
  rating: number;
  text: string;
  time: number;
  profilePhotoUrl: string;
  relativeTimeDescription: string;
  hasReply?: boolean;
};

export type PlaceDetails = {
  name: string;
  rating: number;
  userRatingsTotal: number;
  reviews: GoogleReview[];
};

// Resuelve enlaces cortos de Google (goo.gl / share.google) siguiendo la
// redirección hasta la URL completa de Google Maps. Si no es corto, la devuelve igual.
export async function resolveShortUrl(url: string): Promise<string> {
  try {
    const parsedUrl = new URL(url);
    const isShortLink =
      parsedUrl.hostname.endsWith('goo.gl') ||
      parsedUrl.hostname === 'share.google';
    if (isShortLink) {
      const response = await fetch(url, { method: 'GET', redirect: 'follow' });
      return response.url;
    }
  } catch {}
  return url;
}

// Extrae el Place ID de una URL de Google Maps/Reviews, probando varios formatos.
export function extractPlaceId(url: string): string | null {
  try {
    const parsedUrl = new URL(url);

    const placeid =
      parsedUrl.searchParams.get('placeid') ||
      parsedUrl.searchParams.get('place_id');
    if (placeid) return placeid;

    const q = parsedUrl.searchParams.get('q');
    if (q?.startsWith('place_id:')) return q.slice(9);

    const cid = parsedUrl.searchParams.get('cid');
    if (cid) {
      if (/^\d+$/.test(cid)) return cid;
      console.warn(`[extractPlaceId] cid no numérico ignorado: ${cid}`);
    }

    const ftid = parsedUrl.searchParams.get('ftid');
    if (ftid) {
      console.warn(`[extractPlaceId] ftid ignorado (no es Place ID válido): ${ftid}`);
    }

    const rldimm = parsedUrl.searchParams.get('rldimm');
    if (rldimm) {
      console.warn(`[extractPlaceId] rldimm ignorado (no es Place ID válido): ${rldimm}`);
    }

    const data =
      parsedUrl.searchParams.get('data') ||
      parsedUrl.href.match(/data=([^&?]+)/)?.[1];
    if (data) {
      const raw = decodeURIComponent(data);
      const p1s = raw.match(/!1s(ChI[^!]+)/)?.[1];
      if (p1s) return p1s;
      const p16 = raw.match(/!16s([^!]+)/)?.[1];
      if (p16) {
        const clean = p16.replace(/^\//, '');
        if (/^ChIJ/.test(clean)) return clean;
      }
      const cidHex = raw.match(/!1s0x[0-9a-f]+:0x([0-9a-f]+)/)?.[1];
      if (cidHex) return BigInt(`0x${cidHex}`).toString();
    }

    return null;
  } catch {
    return null;
  }
}

// Extrae las coordenadas (@lat,lng) de una URL de Google Maps.
function extractLatLng(url: string): { lat: number; lng: number } | null {
  const match = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (match) return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
  return null;
}

// Compara nombres ignorando mayúsculas y acentos.
function nameMatches(resultName: string, queryName: string): boolean {
  const normalize = (value: string) =>
    value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const normalizedResult = normalize(resultName);
  const normalizedQuery = normalize(queryName);
  return (
    normalizedResult.includes(normalizedQuery) ||
    normalizedQuery.includes(normalizedResult)
  );
}

// Busca el Place ID por el nombre del negocio con Text Search. Prueba primero
// sesgando por coordenadas (si la URL las trae) y luego sin ellas.
export async function resolveWithTextSearch(
  queryName: string,
  url?: string,
): Promise<string | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY!;
  const coords = url ? extractLatLng(url) : null;

  const searches: { query: string; coordBias: boolean }[] = [
    { query: queryName, coordBias: true },
    { query: queryName, coordBias: false },
  ];

  for (const search of searches) {
    let searchUrl: string;
    if (search.coordBias && coords) {
      searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(search.query)}&location=${coords.lat},${coords.lng}&radius=200&key=${apiKey}`;
    } else {
      searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(search.query)}&key=${apiKey}`;
    }

    const response = await fetch(searchUrl);
    if (!response.ok) continue;

    const payload = await response.json();
    // Lanzamos el error real (billing/cuota) en vez de un "no hay reseñas" genérico.
    if (payload.status === 'REQUEST_DENIED') {
      throw new Error(
        `Google Places API: ${payload.error_message ?? 'acceso denegado'}`,
      );
    }
    if (payload.status === 'OVER_QUERY_LIMIT') {
      throw new Error('Google Places API: límite de consultas excedido');
    }
    if (payload.status === 'INVALID_REQUEST') {
      throw new Error(
        `Google Places API: solicitud inválida - ${payload.error_message ?? ''}`,
      );
    }
    if (payload.status !== 'OK' || !payload.results?.length) continue;

    // Preferimos el resultado cuyo nombre coincide con el del negocio.
    for (const result of payload.results) {
      if (nameMatches(result.name, queryName) && /^ChIJ/.test(result.place_id)) {
        return result.place_id;
      }
    }
  }

  return null;
}

// Si el ID es numérico (CID), lo resolvemos a un Place ID real por nombre.
async function resolvePlaceId(
  placeId: string,
  queryName?: string,
  url?: string,
): Promise<string | null> {
  if (/^\d+$/.test(placeId) && queryName) {
    return resolveWithTextSearch(queryName, url);
  }
  return placeId;
}

// Obtiene los detalles (nombre, nota y reseñas) de un lugar por su Place ID.
export async function fetchPlaceDetails(
  placeId: string,
  queryName?: string,
  url?: string,
): Promise<PlaceDetails | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) throw new Error('Falta GOOGLE_MAPS_API_KEY en .env.local');

  const resolved = await resolvePlaceId(placeId, queryName, url);
  if (!resolved) {
    console.warn(`[fetchPlaceDetails] No se pudo resolver placeId: ${placeId}`);
    return null;
  }
  if (!/^ChIJ/.test(resolved)) {
    console.warn(`[fetchPlaceDetails] placeId resuelto no es ChIJ: ${resolved}`);
    return null;
  }

  const apiUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(resolved)}&fields=name,rating,user_ratings_total,reviews&language=es&key=${apiKey}`;

  const response = await fetch(apiUrl);
  if (!response.ok) {
    console.error(`[fetchPlaceDetails] HTTP ${response.status} al llamar Places API`);
    return null;
  }

  const payload = await response.json();
  if (payload.status === 'REQUEST_DENIED') {
    throw new Error(
      `Google Places API: ${payload.error_message ?? 'acceso denegado'}`,
    );
  }
  if (payload.status === 'OVER_QUERY_LIMIT') {
    throw new Error('Google Places API: límite de consultas excedido');
  }
  if (payload.status === 'INVALID_REQUEST') {
    throw new Error(
      `Google Places API: solicitud inválida - ${payload.error_message ?? ''}`,
    );
  }
  if (payload.status !== 'OK' || !payload.result) {
    console.warn(`[fetchPlaceDetails] API status: ${payload.status} | placeId: ${resolved}`);
    return null;
  }

  const result = payload.result;
  if (queryName && !nameMatches(result.name, queryName)) {
    console.warn(
      `[fetchPlaceDetails] El nombre no coincide | Google: "${result.name}" | Negocio: "${queryName}"`,
    );
    return null;
  }

  return {
    name: result.name ?? '',
    rating: result.rating ?? 0,
    userRatingsTotal: result.user_ratings_total ?? 0,
    reviews: (result.reviews ?? []).map((review: any) => ({
      authorName: review.author_name ?? '',
      rating: review.rating ?? 0,
      text: review.text ?? '',
      time: review.time ?? 0,
      profilePhotoUrl: review.profile_photo_url ?? '',
      relativeTimeDescription: review.relative_time_description ?? '',
    })),
  };
}
