import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  /**
   * NextResponse.next() devuelve la respuesta por defecto, como si el
   * middleware no existiera. La guardamos en una variable "let" porque
   * más abajo la reemplazaremos si Supabase necesita añadir/actualizar
   * cookies de sesión en la respuesta.
   */
  let supabaseResponse = NextResponse.next({ request });

  /**
   * Creamos un cliente de Supabase especial para el middleware.
   * A diferencia del cliente de server actions, aquí no podemos usar
   * cookies() de next/headers porque el middleware se ejecuta antes
   * de que Next.js procese la request. En su lugar, leemos/escribimos
   * las cookies directamente desde el objeto request y response.
   */
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        /**
         * getAll(): Lee todas las cookies HTTP de la petición entrante.
         * Supabase las necesita para saber si existe una sesión activa
         * (access_token, refresh_token, etc.).
         */
        getAll() {
          return request.cookies.getAll();
        },
        /**
         * setAll(): Supabase llama a esta función cuando necesita
         * establecer o actualizar cookies de sesión (por ejemplo,
         * después de refrescar el token). Hacemos dos cosas:
         *  1. Actualizamos la cookie en la request saliente para que
         *     el resto del middleware pueda leer el nuevo valor.
         *  2. Actualizamos la cookie en supabaseResponse para que
         *     se envíe al navegador del usuario.
         */
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  /**
   * isProtected: rutas que requieren sesión
   * isAuth: rutas de login/registro (solo sin sesión)
   */
  const isProtected =
    request.nextUrl.pathname.startsWith('/dashboard') ||
    request.nextUrl.pathname.startsWith('/business') ||
    request.nextUrl.pathname.startsWith('/profile');

  const isAuth =
    request.nextUrl.pathname.startsWith('/sign-in') ||
    request.nextUrl.pathname.startsWith('/sign-up');

  // Solo llamamos a Supabase si es una ruta que requiere saber
  // si el usuario tiene sesión. En rutas públicas (/, /api, ...)
  // nos saltamos la llamada HTTP a Supabase.
  //
  // Usamos getSession() en lugar de getUser() porque lee las cookies
  // localmente sin hacer una petición HTTP a Supabase. Esto es mucho
  // más rápido (~0ms vs ~200ms) y suficiente para el middleware.
  let session = null;

  if (isProtected || isAuth) {
    const {
      data: { session: s },
    } = await supabase.auth.getSession();
    session = s;
  }

  if (isProtected && !session) {
    return NextResponse.redirect(new URL('/sign-in', request.url));
  }

  if (isAuth && session) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return supabaseResponse;
}

/**
 * config.matcher: Patrón de rutas donde se ejecuta el middleware.
 * La expresión regular significa:
 *  - '/' → aplica a todas las rutas
 *  - '(?!...)' → pero NO a las que coincidan con el patrón interno
 *  - '_next' → archivos internos de Next.js (no necesitan auth)
 *  - '\\.[...]' → archivos estáticos con extensión (.css, .js, .png, etc.)
 *
 * Sin esto, el middleware se ejecutaría en cada petición de CSS/JS/imágenes
 * y ralentizaría innecesariamente el sitio.
 */
export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
  ],
};
