'use server';

// ──────────────────────────────────────────────
// Store Locator: datos del local (dirección, mapa,
// fotos y horarios). Solo el dueño del negocio.
// ──────────────────────────────────────────────
// Sigue el mismo patrón que actions/business.ts:
//   1. getUserId() (Supabase Auth)
//   2. ownership con findFirst({ id, userId })
//   3. throw new Error(...) en español
// ──────────────────────────────────────────────

import prisma from '@/lib/db';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import {
  extractLatLng,
  extractPlaceId,
  resolveShortUrl,
  resolveWithTextSearch,
} from '@/lib/google-places';
import {
  MAX_PHOTOS,
  type OpeningHours,
  type StorePhoto,
  googlePeriodsToOpeningHours,
  parseOpeningHoursOrDefault,
  validateOpeningHours,
} from '@/lib/store-hours';

const BUSINESS_PHOTOS_BUCKET = 'business-photos';

// Id del usuario autenticado (o cadena vacía si no hay sesión).
async function getUserId(): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? '';
}

// Devuelve el negocio si pertenece al usuario autenticado.
async function requireOwnedBusiness(businessId: string) {
  const userId = await getUserId();
  if (!userId) throw new Error('No autenticado');

  const business = await prisma.business.findFirst({
    where: { id: businessId, userId },
  });
  if (!business) throw new Error('Negocio no encontrado');

  return business;
}

// ─── Dirección y horarios ───────────────────────

export type StoreInfoData = {
  address: string;
  latitude: number | null;
  longitude: number | null;
  openingHours: OpeningHours | null;
};

export type StoreInfoResult = {
  success: boolean;
  error?: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  openingHours?: OpeningHours | null;
};

const MAX_ADDRESS_LENGTH = 200;

export async function updateStoreInfo(
  businessId: string,
  data: StoreInfoData,
): Promise<StoreInfoResult> {
  try {
    await requireOwnedBusiness(businessId);

    const address = (data.address || '').trim();
    if (address.length > MAX_ADDRESS_LENGTH) {
      throw new Error(`La dirección no puede superar los ${MAX_ADDRESS_LENGTH} caracteres`);
    }

    const latitude = data.latitude ?? null;
    const longitude = data.longitude ?? null;

    if (latitude !== null && (latitude < -90 || latitude > 90)) {
      throw new Error('La latitud no es válida');
    }
    if (longitude !== null && (longitude < -180 || longitude > 180)) {
      throw new Error('La longitud no es válida');
    }
    // Las coordenadas tienen que ir juntas: el mapa necesita ambas.
    if ((latitude === null) !== (longitude === null)) {
      throw new Error('Faltan las coordenadas del local');
    }

    const openingHours = data.openingHours
      ? parseOpeningHoursOrDefault(data.openingHours)
      : null;

    if (openingHours) {
      const errors = validateOpeningHours(openingHours);
      if (errors.length > 0) throw new Error(errors[0]);
    }

    const updated = await prisma.business.update({
      where: { id: businessId },
      data: {
        address: address || null,
        latitude,
        longitude,
        openingHours: openingHours ?? undefined,
      },
      select: { address: true, latitude: true, longitude: true, openingHours: true },
    });

    return {
      success: true,
      address: updated.address,
      latitude: updated.latitude,
      longitude: updated.longitude,
      openingHours: parseOpeningHoursOrDefault(updated.openingHours),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'No se pudo guardar',
    };
  }
}

// ─── Geocodificación ────────────────────────────

export type GeocodeResult = {
  success: boolean;
  error?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
};

// Convierte una dirección en coordenadas con la Geocoding API
// (misma GOOGLE_MAPS_API_KEY que ya usa Places).
export async function geocodeAddress(address: string): Promise<GeocodeResult> {
  const cleanAddress = (address || '').trim();
  if (!cleanAddress) {
    return { success: false, error: 'Escribe una dirección para buscar su ubicación' };
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return { success: false, error: 'Falta GOOGLE_MAPS_API_KEY' };
  }

  // Si el usuario pega un enlace de Google Maps con @lat,lng,
  // no hace falta llamar a la API.
  const fromUrl = extractLatLng(cleanAddress);
  if (fromUrl) {
    return {
      success: true,
      latitude: fromUrl.lat,
      longitude: fromUrl.lng,
      address: cleanAddress,
    };
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(cleanAddress)}&language=es&key=${apiKey}`;
    const response = await fetch(url);
    if (!response.ok) {
      return { success: false, error: 'Error al conectar con Google Maps' };
    }

    const payload = await response.json();

    if (payload.status === 'REQUEST_DENIED') {
      return {
        success: false,
        error: `Geocoding API: ${payload.error_message ?? 'acceso denegado'}`,
      };
    }
    if (payload.status === 'OVER_QUERY_LIMIT') {
      return { success: false, error: 'Límite de consultas excedido. Intenta más tarde.' };
    }
    if (payload.status !== 'OK' || !payload.results?.length) {
      return { success: false, error: 'No encontramos esa dirección' };
    }

    const result = payload.results[0];
    return {
      success: true,
      latitude: result.geometry.location.lat,
      longitude: result.geometry.location.lng,
      address: result.formatted_address || cleanAddress,
    };
  } catch {
    return { success: false, error: 'No se pudo buscar la dirección' };
  }
}

// ─── Importación desde Google ───────────────────────

export type GoogleStoreData = {
  success: boolean;
  error?: string;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
  openingHours?: OpeningHours | null;
};

// Trae los datos del local que ya figuran en Google (dirección,
// coordenadas y horarios) y los devuelve para pre-rellenar el
// formulario. NO guarda: el usuario revisa y pulsa Guardar.
export async function fetchGoogleStoreData(
  businessId: string,
): Promise<GoogleStoreData> {
  try {
    const business = await requireOwnedBusiness(businessId);
    if (!business.googleLink) {
      return { success: false, error: 'El negocio no tiene enlace de Google' };
    }

    const resolvedUrl = await resolveShortUrl(business.googleLink);
    let placeId = extractPlaceId(resolvedUrl);
    if (!placeId) {
      placeId = (await resolveWithTextSearch(business.name, resolvedUrl)) ?? '';
    }
    if (!placeId) {
      return { success: false, error: 'No se pudo encontrar el lugar en Google' };
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return { success: false, error: 'Falta GOOGLE_MAPS_API_KEY' };
    }

    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=formatted_address,geometry,opening_hours&language=es&key=${apiKey}`;
    const response = await fetch(url);
    if (!response.ok) {
      return { success: false, error: 'Error al conectar con Google Maps' };
    }

    const payload = await response.json();
    if (payload.status !== 'OK' || !payload.result) {
      return { success: false, error: 'No se encontraron datos en Google' };
    }

    const result = payload.result;
    const address = result.formatted_address ?? '';
    const latitude = result.geometry?.location?.lat ?? null;
    const longitude = result.geometry?.location?.lng ?? null;
    const periods = result.opening_hours?.periods;
    const openingHours = periods ? googlePeriodsToOpeningHours(periods) : null;

    return { success: true, address, latitude, longitude, openingHours };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'No se pudieron importar los datos',
    };
  }
}

// ─── Fotos del local ────────────────────────────

const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export type PhotoActionResult = {
  success: boolean;
  error?: string;
  photos?: StorePhoto[];
};

// Normaliza el JSON de la BD a un array de fotos válido.
function parsePhotos(value: unknown): StorePhoto[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (photo): photo is StorePhoto =>
      !!photo &&
      typeof photo === 'object' &&
      typeof (photo as StorePhoto).url === 'string' &&
      typeof (photo as StorePhoto).path === 'string',
  );
}

// Sube una foto del local al bucket "business-photos" y la
// guarda en Business.photos (máximo MAX_PHOTOS).
export async function uploadBusinessPhoto(
  businessId: string,
  formData: FormData,
): Promise<PhotoActionResult> {
  try {
    const business = await requireOwnedBusiness(businessId);

    const file = formData.get('file') as File | null;
    if (!file) throw new Error('No se recibió ningún archivo');

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      throw new Error('Formato no permitido. Usa PNG, JPEG o WebP');
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new Error('El archivo no puede superar los 5MB');
    }

    const photos = parsePhotos(business.photos);
    if (photos.length >= MAX_PHOTOS) {
      throw new Error(`Puedes subir hasta ${MAX_PHOTOS} fotos`);
    }

    const fileExtension = file.type.split('/')[1];
    const filePath = `${businessId}/${Date.now()}.${fileExtension}`;

    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUSINESS_PHOTOS_BUCKET)
      .upload(filePath, file, { upsert: true });
    if (uploadError) throw new Error(`Error al subir: ${uploadError.message}`);

    const { data: publicUrlData } = supabaseAdmin.storage
      .from(BUSINESS_PHOTOS_BUCKET)
      .getPublicUrl(filePath);

    const nextPhotos = [...photos, { url: publicUrlData.publicUrl, path: filePath }];

    await prisma.business.update({
      where: { id: businessId },
      data: { photos: nextPhotos },
    });

    return { success: true, photos: nextPhotos };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'No se pudo subir la foto',
    };
  }
}

// Elimina una foto del local (de Supabase Storage y de la lista).
export async function deleteBusinessPhoto(
  businessId: string,
  path: string,
): Promise<PhotoActionResult> {
  try {
    const business = await requireOwnedBusiness(businessId);

    if (!path || !path.startsWith(`${businessId}/`)) {
      throw new Error('Foto no válida');
    }

    const photos = parsePhotos(business.photos);
    const photo = photos.find((item) => item.path === path);
    if (!photo) throw new Error('La foto ya no existe');

    const nextPhotos = photos.filter((item) => item.path !== path);

    await prisma.business.update({
      where: { id: businessId },
      data: { photos: nextPhotos },
    });

    // Si el borrado del storage falla no bloqueamos: la URL ya
    // no se muestra en ninguna parte.
    try {
      const supabaseAdmin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
      );
      await supabaseAdmin.storage
        .from(BUSINESS_PHOTOS_BUCKET)
        .remove([path]);
    } catch {
      // ignorado a propósito
    }

    return { success: true, photos: nextPhotos };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'No se pudo eliminar la foto',
    };
  }
}