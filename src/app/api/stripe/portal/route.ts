import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/db';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id ?? '';
    if (!userId) return NextResponse.redirect('/sign-in');

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true },
    });

    const customerId = user?.subscription?.stripeCustomerId;
    if (!customerId) return NextResponse.redirect('/pricing');

    const { default: Stripe } = await import('stripe');
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard`,
    });

    return NextResponse.redirect(portalSession.url);
  } catch (e) {
    console.error('Stripe portal error:', e);
    return NextResponse.redirect('/pricing');
  }
}
