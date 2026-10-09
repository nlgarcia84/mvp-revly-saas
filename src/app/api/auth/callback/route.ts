import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/db';

// Callback OAuth: Supabase nos devuelve aquí tras el login con un proveedor
// (Google, Facebook...). Canjeamos el código por una sesión y aseguramos que
// el usuario exista en nuestra tabla User.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const providerError = searchParams.get('error');
  const requestedNextPath = searchParams.get('next');
  const nextPath =
    requestedNextPath?.startsWith('/') && !requestedNextPath.startsWith('//')
      ? requestedNextPath
      : '/dashboard';

  // No usamos x-forwarded-host directamente: es una cabecera controlada por
  // el proxy y no debe convertirse en una redirección externa.
  const requestOrigin = origin;

  if (providerError || !code) {
    return NextResponse.redirect(`${requestOrigin}/sign-in?error=oauth_missing_code`);
  }

  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      `${requestOrigin}/sign-in?error=oauth_exchange_failed`,
    );
  }
  if (!user) {
    return NextResponse.redirect(
      `${requestOrigin}/sign-in?error=oauth_no_user`,
    );
  }

  // Creamos el perfil la primera vez que entra este usuario.
  if (user?.email) {
    const existingUser = await prisma.user.findUnique({
      where: { email: user.email },
    });

    // Nunca borrar un perfil existente: podría tener negocios y suscripciones.
    if (existingUser && existingUser.id !== user.id) {
      await supabase.auth.signOut();
      return NextResponse.redirect(
        `${requestOrigin}/sign-in?error=oauth_account_conflict`,
      );
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
