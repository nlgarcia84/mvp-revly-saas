// Genera un token opaco y URL-safe para identificar al cliente
// en su QR personal. No contiene datos ni información manipulable:
// solo sirve para que el servidor localice al cliente.

import { randomBytes } from 'crypto';

// 24 caracteres URL-safe (base64url sin padding).
export function generateQrToken(): string {
  return randomBytes(18).toString('base64url');
}

// Extrae un token del texto leído por el escáner.
// Acepta tanto el token en bruto como una URL tipo
// "https://revly.es/qr/<token>", quedándonos con el
// último segmento de la ruta.
export function extractQrToken(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (trimmed.includes('://')) {
    try {
      const url = new URL(trimmed);
      const segments = url.pathname.split('/').filter(Boolean);
      const last = segments[segments.length - 1];
      return last || null;
    } catch {
      return null;
    }
  }

  return trimmed;
}
