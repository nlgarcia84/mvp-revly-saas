import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/db';
import { getAllGoogleReviews } from '@/actions/google-reviews';
import { getPlan } from '@/lib/subscription';
import { nCard } from '@/components/ui/card';
import { ChartPie } from '@/components/ui/chart';
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

  let googleData: Awaited<ReturnType<typeof getAllGoogleReviews>> = [];
  try {
    googleData = await getAllGoogleReviews();
  } catch (error) {
    console.error('No se pudieron cargar las reseñas de Google para el dashboard:', error);
  }

  const sentimentsByBusiness = businesses.map((business) => {
    const reviews =
      googleData.find((entry) => entry.businessId === business.id)?.reviews ?? [];
    const totals = { positive: 0, neutral: 0, negative: 0 };

    for (const review of reviews) {
      if (review.rating >= 4) totals.positive++;
      else if (review.rating === 3) totals.neutral++;
      else if (review.rating > 0) totals.negative++;
    }

    const totalReviews = totals.positive + totals.neutral + totals.negative;
    return {
      business,
      totalReviews,
      sentiments: [
        { label: 'Positivas', value: totals.positive, color: '#10b981' },
        { label: 'Neutras', value: totals.neutral, color: '#f59e0b' },
        { label: 'Negativas', value: totals.negative, color: '#ef4444' },
      ],
    };
  });

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

      {sentimentsByBusiness.map(({ business, totalReviews, sentiments }) => (
        <div key={business.id} className={`${nCard} p-5 sm:p-6`}>
          <h2 className="text-sm font-semibold mb-4">{business.name}</h2>
          {totalReviews === 0 ? (
            <p className="text-sm text-neutral-500">
              Todavía no hay reseñas para analizar.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              {sentiments.map((sentiment) => {
                const percentage = Math.round((sentiment.value / totalReviews) * 100);
                return (
                  <div key={sentiment.label} className="flex items-center gap-4">
                    <div className="relative h-28 w-28 shrink-0 animate-[fadeSlideIn_0.7s_ease-out]">
                      <ChartPie
                        data={[
                          { name: sentiment.label, value: sentiment.value, color: sentiment.color },
                          { name: 'Resto', value: totalReviews - sentiment.value, color: '#e5e5e5' },
                        ]}
                        height={112}
                      />
                      <span className="absolute inset-0 flex items-center justify-center text-xl font-bold">
                        {percentage}%
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{sentiment.label}</p>
                      <p className="text-xs text-neutral-500">
                        {sentiment.value} reseña{sentiment.value !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
