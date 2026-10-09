import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseConfig } from '@/lib/supabase/config';

// Rutas que solo pueden verse con la sesión iniciada.
const PRIVATE_ROUTES = ['/dashboard', '/business', '/profile'];

// Rutas de acceso (login y registro): si ya hay sesión, no tienen sentido.
const AUTH_ROUTES = ['/sign-in', '/sign-up'];

// Middleware de Next: se ejecuta antes de cada petición que casa con `matcher`.
// Su tarea es refrescar la sesión de Supabase y proteger las rutas privadas.
export async function proxy(request: NextRequest) {
  const { url, anonKey } = getSupabaseConfig();
  // Respuesta base; la iremos reemplazando cuando Supabase escriba cookies.
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    url,
    anonKey,
    {
      cookies: {
        // Leemos las cookies de la petición entrante.
        getAll() {
          return request.cookies.getAll();
        },
        // Supabase llama aquí cuando refresca la sesión y hay que guardar cookies.
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const pathname = request.nextUrl.pathname;
  const isPrivateRoute = PRIVATE_ROUTES.some((route) => pathname.startsWith(route));
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));

  // Solo pedimos el usuario si la ruta lo necesita, para no hacer
  // una llamada de red en cada petición.
  let currentUser = null;
  if (isPrivateRoute || isAuthRoute) {
    const { data } = await supabase.auth.getUser();
    currentUser = data.user;
  }

  // Ruta privada sin sesión → al login.
  if (isPrivateRoute && !currentUser) {
    const redirectResponse = NextResponse.redirect(new URL('/sign-in', request.url));
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });
    return redirectResponse;
  }

  // Login o registro con sesión activa → al dashboard.
  if (isAuthRoute && currentUser) {
    const redirectResponse = NextResponse.redirect(new URL('/dashboard', request.url));
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });
    return redirectResponse;
  }

  return response;
}

export const config = {
  matcher: [
    // Se aplica a todo excepto archivos estáticos e imágenes.
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
  ],
};
