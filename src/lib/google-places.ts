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

// ─── resuelve enlaces cortos de Google ─────────────
// Cuando un usuario pega un enlace tipo
// "https://maps.app.goo.gl/XXXX" (enlace corto de Google),
// este código sigue la redirección hasta obtener la URL
// completa de Google Maps, que es la que contiene los
// datos del lugar (Place ID, coordenadas, etc.).
//
// Si la URL no es de goo.gl, la devuelve tal cual.
// ─────────────────────────────────────────────────────
export async function resolveShortUrl(url: string): Promise<string> {
  try {
    const u = new URL(url);
    // Solo seguimos redirecciones si el dominio termina
    // en "goo.gl" (incluye maps.app.goo.gl)
    if (u.hostname.endsWith('goo.gl')) {
      const res = await fetch(url, { method: 'HEAD', redirect: 'follow' });
      return res.url;
    }
  } catch {}
  return url;
}

export function extractPlaceId(url: string): string | null {
  try {
    const u = new URL(url);

    const placeid = u.searchParams.get('placeid') || u.searchParams.get('place_id');
    if (placeid) return placeid;

    const q = u.searchParams.get('q');
    if (q?.startsWith('place_id:')) return q.slice(9);

    const cid = u.searchParams.get('cid');
    if (cid) {
      if (/^\d+$/.test(cid)) return cid;
      console.warn(`[extractPlaceId] cid no numérico ignorado: ${cid}`);
    }

    const ftid = u.searchParams.get('ftid');
    if (ftid) {
      console.warn(`[extractPlaceId] ftid ignorado (no es Place ID válido): ${ftid}`);
    }

    const rldimm = u.searchParams.get('rldimm');
    if (rldimm) {
      console.warn(`[extractPlaceId] rldimm ignorado (no es Place ID válido): ${rldimm}`);
    }

    const data = u.searchParams.get('data') || u.href.match(/data=([^&?]+)/)?.[1];
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

function extractLatLng(url: string): { lat: number; lng: number } | null {
  const m = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
  return null;
}

function nameMatches(resultName: string, queryName: string): boolean {
  const a = resultName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const b = queryName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return a.includes(b) || b.includes(a);
}

async function resolveWithTextSearch(queryName: string, url?: string): Promise<string | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY!;
  const coords = url ? extractLatLng(url) : null;

  // Try 3 strategies in order: with coords, without coords, with more specific name
  const searches: { query: string; coordBias: boolean }[] = [
    { query: queryName, coordBias: true },
    { query: queryName, coordBias: false },
  ];

  for (const s of searches) {
    let searchUrl: string;
    if (s.coordBias && coords) {
      searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(s.query)}&location=${coords.lat},${coords.lng}&radius=200&key=${apiKey}`;
    } else {
      searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(s.query)}&key=${apiKey}`;
    }

    const res = await fetch(searchUrl);
    if (!res.ok) continue;
    const data = await res.json();
    if (data.status !== 'OK' || !data.results?.length) continue;

    // Prefer result whose name matches the business name
    for (const result of data.results) {
      if (nameMatches(result.name, queryName)) {
        const pid = result.place_id;
        if (/^ChIJ/.test(pid)) return pid;
      }
    }
  }

  return null;
}

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

  const res = await fetch(apiUrl);
  if (!res.ok) {
    console.error(`[fetchPlaceDetails] HTTP ${res.status} al llamar Places API`);
    return null;
  }

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
  if (data.status !== 'OK' || !data.result) {
    console.warn(`[fetchPlaceDetails] API status: ${data.status} | placeId: ${resolved}`);
    return null;
  }

  const result = data.result;

  if (queryName && !nameMatches(result.name, queryName)) {
    console.warn(`[fetchPlaceDetails] El nombre no coincide | Google: "${result.name}" | Negocio: "${queryName}"`);
    return null;
  }

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
