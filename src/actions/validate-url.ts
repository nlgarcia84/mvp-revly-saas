'use server';

import { resolveShortUrl, extractPlaceId } from '@/lib/google-places';

// Resultado de validar un enlace de Google Maps / Reviews.
export type UrlValidationResult =
  | { valid: true; placeId: string; resolvedUrl: string }
  | { valid: false; error: string; resolvedUrl?: string };

// Comprueba que la URL tenga un Place ID de Google válido. Si es un enlace
// corto (goo.gl), sigue la redirección antes de extraer el ID.
export async function validateGoogleUrl(
  url: string,
): Promise<UrlValidationResult> {
  // Campo vacío: no es un error, el usuario puede no tener Google Reviews.
  if (!url || !url.trim()) {
    return { valid: false, error: 'Introduce una URL' };
  }

  // Comprobamos que la URL tenga un formato válido antes de procesarla.
  try {
    new URL(url);
  } catch {
    return { valid: false, error: 'La URL no es válida' };
  }

  const resolvedUrl = await resolveShortUrl(url);
  const placeId = extractPlaceId(resolvedUrl);

  if (!placeId) {
    return {
      valid: false,
      error:
        'No se pudo encontrar un ID de lugar de Google en esta URL. Asegúrate de que sea un enlace de Google Maps o Google Reviews.',
      resolvedUrl: resolvedUrl !== url ? resolvedUrl : undefined,
    };
  }

  return { valid: true, placeId, resolvedUrl };
}
