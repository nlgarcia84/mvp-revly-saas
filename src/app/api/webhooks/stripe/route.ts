import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature') || '';

  const { default: Stripe } = await import('stripe');
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

  let event: any;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.userId || session.client_reference_id;
        if (!userId) break;

        const subscriptionId = session.subscription as string;
        const customerId = session.customer as string;
        // El plan se pasa en metadata al crear la sesión de checkout.
        // Si no hay metadata.plan, se deduce del line_items.
        let plan = session.metadata?.plan as string;
        if (!plan && subscriptionId) {
          const sub: any = await stripe.subscriptions.retrieve(subscriptionId);
          const priceId = sub.items?.data?.[0]?.price?.id;
          if (priceId === 'price_1R41NhGGc0u0LW2eH0y6Q3mh') plan = 'avanzado';
          else if (priceId === 'price_PRO_PLACEHOLDER') plan = 'pro';
          else plan = 'avanzado';
        }

        if (subscriptionId) {
          const sub: any = await stripe.subscriptions.retrieve(subscriptionId);
          await prisma.subscription.upsert({
            where: { userId },
            create: {
              userId,
              plan: plan || 'avanzado',
              status: sub.status === 'active' ? 'active' : 'inactive',
              stripeCustomerId: customerId,
              stripeSubscriptionId: subscriptionId,
              currentPeriodEnd: new Date(sub.current_period_end * 1000),
            },
            update: {
              plan: plan || 'avanzado',
              status: sub.status === 'active' ? 'active' : 'inactive',
              stripeCustomerId: customerId,
              stripeSubscriptionId: subscriptionId,
              currentPeriodEnd: new Date(sub.current_period_end * 1000),
            },
          });
        }
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subEvent = event.data.object;
        const customerId = subEvent.customer as string;

        const sub = await prisma.subscription.findFirst({
          where: { stripeCustomerId: customerId },
        });
        if (!sub) break;

        const isActive = subEvent.status === 'active' || subEvent.status === 'trialing';
        // Si sigue activo, mantiene el plan actual. Si se cancela, vuelve a basico.
        await prisma.subscription.update({
          where: { id: sub.id },
          data: {
            status: isActive ? 'active' : 'inactive',
            plan: isActive ? sub.plan : 'basico',
            currentPeriodEnd: subEvent.current_period_end
              ? new Date(subEvent.current_period_end * 1000)
              : null,
          },
        });
        break;
      }
    }
  } catch (e) {
    console.error('Stripe webhook error:', e);
  }

  return NextResponse.json({ received: true });
}
