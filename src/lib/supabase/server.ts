import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabaseConfig } from './config';

export async function createClient() {
  // Obtiene las cookies de la petición actual (Next.js Server Components/Server Actions)
  const cookieStore = await cookies();
  const { url, anonKey } = getSupabaseConfig();

  // Crea un cliente de Supabase configurado para usar cookies HTTP
  // en lugar de localStorage (que es lo que usa en el navegador)
  return createServerClient(
    url,
    anonKey,
    {
      cookies: {
        // Lee todas las cookies de la petición entrante
        getAll() {
          return cookieStore.getAll();
        },
        // Guarda las cookies de sesión que Supabase necesita
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        },
      },
    },
  );
}
