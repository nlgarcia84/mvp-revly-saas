import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/db';

// ─── Callback OAuth (Facebook/Google) ─────────────────
// Supabase nos redirige aquí después de que el usuario se
// identifique en el proveedor. Intercambiamos el código
// por una sesión y creamos el usuario en nuestra tabla User
// si es la primera vez que entra.
// ─────────────────────────────────────────────────────
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  // Usamos el host de la propia petición para no cambiar de dominio
  // (www vs sin www): si redirigimos a otro host, las cookies de sesión
  // no viajan y el middleware no ve la sesión.
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto') ?? 'https';
  const requestOrigin = forwardedHost ? `${forwardedProto}://${forwardedHost}` : origin;

  if (!code) {
    return NextResponse.redirect(`${requestOrigin}/sign-in?error=oauth_missing_code`);
  }

  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${requestOrigin}/sign-in?error=${encodeURIComponent(error.message)}`);
  }

  // Aseguramos que el usuario exista en nuestra tabla User
  if (user?.email) {
    const existing = await prisma.user.findUnique({ where: { email: user.email } });
    if (existing && existing.id !== user.id) {
      // Usuario de la época de Clerk (id distinto) → lo reemplazamos
      await prisma.user.delete({ where: { id: existing.id } });
    }
    const current = existing && existing.id === user.id ? existing : null;
    if (!current) {
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

  return NextResponse.redirect(`${requestOrigin}${next}`);
}