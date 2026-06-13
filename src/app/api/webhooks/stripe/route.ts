import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import prisma from '@/lib/db';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature') || '';

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId || session.client_reference_id;
        if (!userId) break;

        const subscriptionId = session.subscription as string;
        const customerId = session.customer as string;

        if (subscriptionId) {
          const sub: any = await stripe.subscriptions.retrieve(subscriptionId);
          await prisma.subscription.upsert({
            where: { userId },
            create: {
              userId,
              plan: 'pro',
              status: sub.status === 'active' ? 'active' : 'inactive',
              stripeCustomerId: customerId,
              stripeSubscriptionId: subscriptionId,
              currentPeriodEnd: new Date(sub.current_period_end * 1000),
            },
            update: {
              plan: 'pro',
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
        const subEvent = event.data.object as any;
        const customerId = subEvent.customer as string;

        const sub = await prisma.subscription.findFirst({
          where: { stripeCustomerId: customerId },
        });
        if (!sub) break;

        const isActive = subEvent.status === 'active' || subEvent.status === 'trialing';
        await prisma.subscription.update({
          where: { id: sub.id },
          data: {
            status: isActive ? 'active' : 'inactive',
            plan: isActive ? 'pro' : 'free',
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
