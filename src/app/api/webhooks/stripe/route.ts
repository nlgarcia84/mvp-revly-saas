import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import stripe from '@/lib/stripe';

const PRICE_TO_PLAN: Record<string, string> = {
  price_1U1WfmR8J40peD82mTLBUosR: 'avanzado',
  price_1U1WhkR8J40peD825bfelw3g: 'pro',
};

// Webhook de Stripe: sincroniza el estado de la suscripción en nuestra BD.
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get('stripe-signature') || '';
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

  let event: any;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
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

        // El plan llega en metadata; si no, se deduce del precio de la suscripción.
        let plan = session.metadata?.plan as string;
        if (!plan && subscriptionId) {
          const subscription: any =
            await stripe.subscriptions.retrieve(subscriptionId);
          const priceId = subscription.items?.data?.[0]?.price?.id;
          plan = PRICE_TO_PLAN[priceId] ?? 'avanzado';
        }

        if (subscriptionId) {
          const subscription: any =
            await stripe.subscriptions.retrieve(subscriptionId);
          await prisma.subscription.upsert({
            where: { userId },
            create: {
              userId,
              plan: plan || 'avanzado',
              status: subscription.status === 'active' ? 'active' : 'inactive',
              stripeCustomerId: customerId,
              stripeSubscriptionId: subscriptionId,
              currentPeriodEnd: new Date(
                subscription.current_period_end * 1000,
              ),
            },
            update: {
              plan: plan || 'avanzado',
              status: subscription.status === 'active' ? 'active' : 'inactive',
              stripeCustomerId: customerId,
              stripeSubscriptionId: subscriptionId,
              currentPeriodEnd: new Date(
                subscription.current_period_end * 1000,
              ),
            },
          });
        }
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscriptionEvent = event.data.object;
        const customerId = subscriptionEvent.customer as string;

        const existingSubscription = await prisma.subscription.findFirst({
          where: { stripeCustomerId: customerId },
        });
        if (!existingSubscription) break;

        const isActive =
          subscriptionEvent.status === 'active' ||
          subscriptionEvent.status === 'trialing';
        // Si sigue activo, mantiene el plan actual; si se cancela, vuelve a básico.
        await prisma.subscription.update({
          where: { id: existingSubscription.id },
          data: {
            status: isActive ? 'active' : 'inactive',
            plan: isActive ? existingSubscription.plan : 'basico',
            currentPeriodEnd: subscriptionEvent.current_period_end
              ? new Date(subscriptionEvent.current_period_end * 1000)
              : null,
          },
        });
        break;
      }
    }
  } catch (error) {
    console.error('Stripe webhook error:', error);
  }

  return NextResponse.json({ received: true });
}
