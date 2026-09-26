import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/db';
import stripe from '@/lib/stripe';

// Redirige al portal de facturación de Stripe del usuario.
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const userId = authUser?.id ?? '';
    if (!userId) return NextResponse.redirect('/sign-in');

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true },
    });

    const customerId = user?.subscription?.stripeCustomerId;
    if (!customerId) return NextResponse.redirect('/pricing');

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard`,
    });

    return NextResponse.redirect(portalSession.url);
  } catch (error) {
    console.error('Stripe portal error:', error);
    return NextResponse.redirect('/pricing');
  }
}
