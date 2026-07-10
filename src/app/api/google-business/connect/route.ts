import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/db';

// ─── Inicia la conexión con Google Business Profile ──
// Botón "Conectar con Google" en Settings.
//   1. Verifica que el usuario esté autenticado
//   2. Guarda el ID del negocio en la URL de callback
//   3. Redirige a Google OAuth para pedir permisos
//
// Cuando el usuario autorice, Google llamará a nuestra
// ruta /api/google-business/callback con un código.
// ─────────────────────────────────────────────────────
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id ?? '';
    if (!userId) return NextResponse.redirect(new URL('/sign-in', request.url));

    // Leemos el businessId de la query (lo pasamos desde Settings)
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    if (!businessId) {
      return NextResponse.redirect(new URL('/business', request.url));
    }

    // Verificamos que el negocio existe y pertenece al usuario
    const business = await prisma.business.findFirst({
      where: { id: businessId, userId },
    });
    if (!business) {
      return NextResponse.redirect(new URL('/business', request.url));
    }

    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const REDIRECT_URI = `${APP_URL}/api/google-business/callback`;
    console.log('[GoogleBusiness/Connect] APP_URL:', APP_URL, 'REDIRECT_URI:', REDIRECT_URI, 'CLIENT_ID:', GOOGLE_CLIENT_ID?.slice(0, 20) + '...');

    // Construimos la URL de autorización de Google
    // El state contiene el businessId para saber a qué negocio
    // asociar los tokens cuando Google nos responda.
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/business.manage',
      state: businessId,
      access_type: 'offline',             // para que nos dé refresh token
      prompt: 'consent',                  // fuerza obtener refresh token siempre
    });

    return NextResponse.redirect(
      `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
    );
  } catch (e) {
    console.error('[GoogleBusiness/Connect] Error:', e);
    return NextResponse.redirect(new URL('/business', request.url));
  }
}
