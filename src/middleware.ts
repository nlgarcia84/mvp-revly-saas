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
   * getUser(): Verifica la sesión actual llamando a Supabase Auth.
   * Si el usuario tiene cookies de sesión válidas, devuelve el objeto
   * user con su id, email, etc. Si no, user es null.
   * Es importante usar getUser() y no getUser() para evitar
   * almacenar sesiones en caché y siempre verificar contra Supabase.
   */
  const {
    data: { user },
  } = await supabase.auth.getUser();

  /**
   * isProtected: Rutas que solo pueden ver usuarios autenticados.
   * Si el usuario no ha iniciado sesión, lo redirigimos a /sign-in.
   * Añade aquí cualquier ruta nueva que requiera autenticación.
   */
  const isProtected =
    request.nextUrl.pathname.startsWith('/dashboard') ||
    request.nextUrl.pathname.startsWith('/business');

  /**
   * isAuth: Rutas de autenticación (inicio de sesión y registro).
   * Si el usuario ya tiene sesión activa, no tiene sentido que vea
   * estas páginas, así que lo redirigimos al dashboard.
   */
  const isAuth =
    request.nextUrl.pathname.startsWith('/sign-in') ||
    request.nextUrl.pathname.startsWith('/sign-up');

  if (isProtected && !user) {
    return NextResponse.redirect(new URL('/sign-in', request.url));
  }

  if (isAuth && user) {
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
