import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/db';
import stripe from '@/lib/stripe';

const PRICE_TO_PLAN: Record<string, string> = {
  price_1U1WfmR8J40peD82mTLBUosR: 'avanzado',
  price_1U1WhkR8J40peD825bfelw3g: 'pro',
};

// Crea una sesión de Stripe Checkout para suscribirse a un plan.
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const userId = authUser?.id ?? '';
    if (!userId) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { priceId } = await request.json();
    if (!priceId) {
      return NextResponse.json({ error: 'Falta priceId' }, { status: 400 });
    }

    const plan = PRICE_TO_PLAN[priceId];
    if (!plan) {
      return NextResponse.json({ error: 'Plan no reconocido' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true },
    });
    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    const customerId = user.subscription?.stripeCustomerId;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      customer: customerId || undefined,
      customer_email: customerId ? undefined : user.email,
      client_reference_id: userId,
      success_url: `${appUrl}/dashboard?checkout=success&plan=${plan}`,
      cancel_url: `${appUrl}/pricing?checkout=cancel`,
      metadata: { userId, plan },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json(
      { error: 'Error al crear sesión de pago' },
      { status: 500 },
    );
  }
}
