import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/db';

const PRICE_TO_PLAN: Record<string, string> = {
  'price_1U1WfmR8J40peD82mTLBUosR': 'avanzado',
  'price_1U1WhkR8J40peD825bfelw3g': 'pro',
};

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id ?? '';
    if (!userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { priceId } = await request.json();
    if (!priceId) return NextResponse.json({ error: 'Falta priceId' }, { status: 400 });

    const plan = PRICE_TO_PLAN[priceId];
    if (!plan) return NextResponse.json({ error: 'Plan no reconocido' }, { status: 400 });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true },
    });
    if (!user) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });

    const { default: Stripe } = await import('stripe');
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

    const customerId = user.subscription?.stripeCustomerId;

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      customer: customerId || undefined,
      customer_email: customerId ? undefined : user.email,
      client_reference_id: userId,
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard?checkout=success&plan=${plan}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/pricing?checkout=cancel`,
      metadata: { userId, plan },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (e) {
    console.error('Stripe checkout error:', e);
    return NextResponse.json({ error: 'Error al crear sesión de pago' }, { status: 500 });
  }
}
