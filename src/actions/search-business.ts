'use server';

// Busca negocios en Google Places por nombre (y opcionalmente ciudad o
// código postal). Se usa cuando el usuario no tiene a mano el enlace de su ficha.
export type GooglePlaceResult = {
  placeId: string;
  name: string;
  address: string;
  rating: number | null;
  userRatingsTotal: number | null;
  googleLink: string;
};

export async function searchBusinessOnGoogle(
  query: string,
  location?: string,
  postalCode?: string,
): Promise<GooglePlaceResult[]> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) throw new Error('Falta GOOGLE_MAPS_API_KEY');

  // Añadimos ciudad y código postal para afinar la búsqueda.
  const queryParts = [query, location, postalCode].filter(Boolean);
  const fullQuery = queryParts.join(' ');

  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(fullQuery)}&language=es&key=${apiKey}`;

  const response = await fetch(url);
  if (!response.ok) throw new Error('Error al conectar con Google Places');

  const payload = await response.json();

  if (payload.status === 'REQUEST_DENIED') {
    throw new Error(
      `Google Places API: ${payload.error_message ?? 'acceso denegado'}`,
    );
  }
  if (payload.status === 'OVER_QUERY_LIMIT') {
    throw new Error('Límite de consultas excedido. Intenta más tarde.');
  }
  if (payload.status !== 'OK' || !payload.results) {
    return [];
  }

  return payload.results.map((place: any) => ({
    placeId: place.place_id,
    name: place.name ?? '',
    address: place.formatted_address ?? '',
    rating: place.rating ?? null,
    userRatingsTotal: place.user_ratings_total ?? null,
    // Enlace que nuestro extractPlaceId sabe leer (?q=place_id:...).
    googleLink: `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
  }));
}
