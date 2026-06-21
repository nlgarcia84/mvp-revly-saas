'use server';

// ─── Buscador de negocios en Google Places ─────────
// Permite buscar un negocio por su nombre (y opcionalmente
// ciudad/dirección) en Google Places. Devuelve una lista
// de resultados para que el usuario elija el suyo.
//
// Útil cuando el usuario no tiene un enlace de Google Maps
// a mano: simplemente escribe el nombre de su negocio y
// el sistema encuentra la ficha de Google automáticamente.
// ─────────────────────────────────────────────────────

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
): Promise<GooglePlaceResult[]> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) throw new Error('Falta GOOGLE_MAPS_API_KEY');

  // Construimos la consulta para la API de Text Search.
  // Si el usuario indicó una ubicación (ciudad), la
  // añadimos para que los resultados sean más precisos.
  const searchQuery = location ? `${query} ${location}` : query;

  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchQuery)}&language=es&key=${apiKey}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error('Error al conectar con Google Places');

  const data = await res.json();

  if (data.status === 'REQUEST_DENIED') {
    throw new Error(`Google Places API: ${data.error_message ?? 'acceso denegado'}`);
  }
  if (data.status === 'OVER_QUERY_LIMIT') {
    throw new Error('Límite de consultas excedido. Intenta más tarde.');
  }
  if (data.status !== 'OK' || !data.results) {
    return [];
  }

  // Convertimos los resultados al formato que necesita
  // nuestra aplicación, incluyendo un enlace de Google
  // Maps que podemos guardar directamente.
  return data.results.map((r: any) => ({
    placeId: r.place_id,
    name: r.name ?? '',
    address: r.formatted_address ?? '',
    rating: r.rating ?? null,
    userRatingsTotal: r.user_ratings_total ?? null,
    // Construimos un enlace que nuestro extractPlaceId
    // sabe leer: usa el formato ?q=place_id:ChIJ...
    googleLink: `https://www.google.com/maps/place/?q=place_id:${r.place_id}`,
  }));
}
