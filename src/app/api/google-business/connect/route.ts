import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/db';

// Inicia la conexión con Google Business Profile (botón "Conectar con Google").
// Verifica sesión y propiedad del negocio, y redirige al OAuth de Google.
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id ?? '';
    if (!userId) return NextResponse.redirect(new URL('/sign-in', request.url));

    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    if (!businessId) {
      return NextResponse.redirect(new URL('/business', request.url));
    }

    const business = await prisma.business.findFirst({
      where: { id: businessId, userId },
    });
    if (!business) {
      return NextResponse.redirect(new URL('/business', request.url));
    }

    const clientId = process.env.GOOGLE_CLIENT_ID!;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const redirectUri = `${appUrl}/api/google-business/callback`;

    // El state lleva el businessId para asociar los tokens a este negocio.
    const oauthParams = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/business.manage',
      state: businessId,
      access_type: 'offline', // para obtener refresh token
      prompt: 'consent', // fuerza refresh token siempre
    });

    return NextResponse.redirect(
      `https://accounts.google.com/o/oauth2/v2/auth?${oauthParams.toString()}`,
    );
  } catch (error) {
    console.error('[GoogleBusiness/Connect] Error:', error);
    return NextResponse.redirect(new URL('/business', request.url));
  }
}
