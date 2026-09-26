import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/db';

// Desconecta Google Business Profile: limpia tokens e IDs. Las reseñas
// vuelven a obtenerse desde Places API (solo 5).
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

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return NextResponse.redirect(
      `${appUrl}/business/${businessId}/settings?bp_success=Desconectado de Google Business Profile`,
    );
  } catch (error) {
    console.error('[GoogleBusiness/Disconnect] Error:', error);
    return NextResponse.redirect(new URL('/business', request.url));
  }
}
