'use server';

// ─── Validador de enlaces de Google Maps / Reviews ──
// Comprueba si una URL de Google contiene un ID de lugar
// (Place ID) válido. Se usa en la página de configuración
// para dar feedback al usuario antes de guardar.
//
// Pasos:
//   1. Verifica que la URL tenga un formato válido
//   2. Si es un enlace corto (goo.gl), sigue la
//      redirección para obtener la URL real
//   3. Extrae el ID de lugar (Place ID) de la URL
//   4. Devuelve si es válido o no, con un mensaje claro
// ─────────────────────────────────────────────────────

import { resolveShortUrl, extractPlaceId } from '@/lib/google-places';

// Resultado de la validación:
// - valid = true: la URL tiene un Place ID válido
// - valid = false: la URL no sirve, con un mensaje de error
export type UrlValidationResult =
  | { valid: true; placeId: string; resolvedUrl: string }
  | { valid: false; error: string; resolvedUrl?: string };

export async function validateGoogleUrl(url: string): Promise<UrlValidationResult> {
  // Si la URL está vacía, no mostramos error (el usuario
  // puede dejar el campo vacío si no tiene Google Reviews)
  if (!url || !url.trim()) {
    return { valid: false, error: 'Introduce una URL' };
  }

  // Comprueba que la URL tenga un formato correcto (protocolo,
  // dominio, etc.) antes de intentar procesarla
  try {
    new URL(url);
  } catch {
    return { valid: false, error: 'La URL no es válida' };
  }

  // Si es un enlace corto (maps.app.goo.gl/...), seguimos
  // la redirección para obtener la URL completa de Google Maps
  const resolvedUrl = await resolveShortUrl(url);

  // Intentamos extraer el ID de lugar (Place ID) de la URL
  const placeId = extractPlaceId(resolvedUrl);

  if (!placeId) {
    return {
      valid: false,
      error: 'No se pudo encontrar un ID de lugar de Google en esta URL. Asegúrate de que sea un enlace de Google Maps o Google Reviews.',
      resolvedUrl: resolvedUrl !== url ? resolvedUrl : undefined,
    };
  }

  return { valid: true, placeId, resolvedUrl };
}
