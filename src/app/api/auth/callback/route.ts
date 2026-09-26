import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/db';

// Callback OAuth: Supabase nos devuelve aquí tras el login con un proveedor
// (Google, Facebook...). Canjeamos el código por una sesión y aseguramos que
// el usuario exista en nuestra tabla User.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const nextPath = searchParams.get('next') ?? '/dashboard';

  // Redirigimos al mismo host de la petición (www vs sin www) para que las
  // cookies de sesión viajen y el proxy no pierda la sesión.
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto') ?? 'https';
  const requestOrigin = forwardedHost
    ? `${forwardedProto}://${forwardedHost}`
    : origin;

  if (!code) {
    return NextResponse.redirect(`${requestOrigin}/sign-in?error=oauth_missing_code`);
  }

  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      `${requestOrigin}/sign-in?error=${encodeURIComponent(error.message)}`,
    );
  }

  // Creamos el perfil la primera vez que entra este usuario.
  if (user?.email) {
    const existingUser = await prisma.user.findUnique({
      where: { email: user.email },
    });

    // Usuario antiguo con otro id (época de Clerk): lo reemplazamos.
    if (existingUser && existingUser.id !== user.id) {
      await prisma.user.delete({ where: { id: existingUser.id } });
    }

    const userAlreadyExists = existingUser?.id === user.id;
    if (!userAlreadyExists) {
      await prisma.user.create({
        data: {
          id: user.id,
          email: user.email,
          name:
            (user.user_metadata?.name as string) ??
            (user.user_metadata?.full_name as string) ??
            null,
          subscription: {
            create: {
              plan: 'free',
              status: 'active',
              trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            },
          },
        },
      });
    }
  }

  return NextResponse.redirect(`${requestOrigin}${nextPath}`);
}
