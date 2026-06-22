import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/db';

// ─── Desconecta Google Business Profile ──────────────
// Botón "Desconectar" en Settings. Borra los tokens y
// las IDs de la base de datos. A partir de ese momento,
// las reseñas se obtendrán otra vez desde Places API
// (solo 5 reseñas).
// ─────────────────────────────────────────────────────
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id ?? '';
    if (!userId) return NextResponse.redirect(new URL('/sign-in', request.url));

    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    if (!businessId) {
      return NextResponse.redirect(new URL('/business', request.url));
    }

    // Limpiamos los campos de Google Business Profile
    await prisma.business.update({
      where: { id: businessId, userId },
      data: {
        googleBusinessAccessToken: null,
        googleBusinessRefreshToken: null,
        googleBusinessTokenExpiry: null,
        googleBusinessAccountId: null,
        googleBusinessLocationId: null,
      },
    });

    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return NextResponse.redirect(
      `${APP_URL}/business/${businessId}/settings?bp_success=Desconectado de Google Business Profile`,
    );
  } catch (e) {
    console.error('[GoogleBusiness/Disconnect] Error:', e);
    return NextResponse.redirect(
      new URL('/business', request.url),
    );
  }
}
