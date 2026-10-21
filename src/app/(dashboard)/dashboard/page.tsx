import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/db';
import { getPlan } from '@/lib/subscription';
import { nCard } from '@/components/ui/card';
import CheckoutSuccessBanner from '@/components/checkout-success-banner';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect('/sign-in');

  const userId = authUser.id;
  const [user, planData, businesses] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    getPlan(userId),
    prisma.business.findMany({ where: { userId } }),
  ]);
  const name =
    user?.name ||
    authUser.user_metadata?.full_name ||
    authUser.user_metadata?.name ||
    '';

  return (
    <div className="mx-auto flex w-full max-w-6xl min-w-0 flex-col gap-5 sm:gap-6">
      <div className={`${nCard} p-5 sm:p-6 lg:p-7`}>
        <h1 className="mb-2 flex flex-wrap items-center gap-2.5 text-2xl font-semibold tracking-tight sm:text-3xl">
          {name ? `Hola, ${name}` : 'Hola'}
          <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
            {planData.plan === 'pro' ? 'Pro' : 'Gratis'}
          </span>
        </h1>
        <p className="text-sm text-neutral-500">
          Tienes {businesses.length} negocio{businesses.length !== 1 ? 's' : ''} registrado{businesses.length !== 1 ? 's' : ''}
        </p>
      </div>

      <Suspense fallback={null}>
        <CheckoutSuccessBanner currentPlan={planData.plan} />
      </Suspense>

    </div>
  );
}
