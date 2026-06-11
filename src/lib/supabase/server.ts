import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  // Obtiene las cookies de la petición actual (Next.js Server Components/Server Actions)
  const cookieStore = await cookies();

  // Crea un cliente de Supabase configurado para usar cookies HTTP
  // en lugar de localStorage (que es lo que usa en el navegador)
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!, // URL del proyecto Supabase
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, // Clave anónima (pública) de Supabase
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
