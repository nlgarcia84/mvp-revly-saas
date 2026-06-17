import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/db';
import Link from 'next/link';
import { ChartLine } from '@/components/ui/chart';
import { getAllGoogleReviews } from '@/actions/google-reviews';
import { getPlan } from '@/lib/subscription';
import { nCard } from '@/components/ui/card';

const indicator: Record<string, string> = {
  blue: 'bg-blue-500',
  violet: 'bg-violet-500',
  amber: 'bg-amber-500',
  emerald: 'bg-emerald-500',
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id ?? '';
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { subscription: true },
  });
  const name = user?.name ?? '';
  const planData = await getPlan(userId);
  const plan = planData.plan;
  const trialDaysLeft = planData.trialDaysLeft;

  const businesses = await prisma.business.findMany({
    where: { userId },
    include: { _count: { select: { customers: true } } },
  });

  const totalBusinesses = businesses.length;

  const allCustomers = await prisma.customer.findMany({
    where: { business: { userId } },
    select: { status: true, createdAt: true, rating: true },
  });

  const totalCustomers = allCustomers.length;
  const pending = allCustomers.filter((c) => c.status === 'pending').length;
  const invited = allCustomers.filter((c) => c.status === 'invited').length;
  const completed = allCustomers.filter((c) => c.status === 'completed').length;
  const conversionRate = invited > 0 ? Math.round((completed / invited) * 100) : null;

  let googleAvg: string | null = null;
  let googleTotal = 0;
  try {
    const googleData = await getAllGoogleReviews();
    if (googleData && googleData.length > 0) {
      const ratings = googleData.map((g) => g.rating).filter((r) => r > 0);
      if (ratings.length > 0) {
        googleAvg = (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1);
        googleTotal = googleData.reduce((s, g) => s + g.userRatingsTotal, 0);
      }
    }
  } catch {}
  const avgRating = googleAvg ?? '—';

  const ratingDist = googleAvg
    ? []
    : [5, 4, 3, 2, 1].map((n) => ({
        label: String(n),
        value: allCustomers.filter((c) => c.status === 'completed' && c.rating === n).length,
      }));

  const completedCustomers = allCustomers.filter((c) => c.status === 'completed');

  const today = new Date();
  const dailyData: { label: string; value: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const dayEnd = new Date(dayStart.getTime() + 86_400_000);
    const count = completedCustomers.filter(
      (c) => c.createdAt >= dayStart && c.createdAt < dayEnd,
    ).length;
    dailyData.push({
      label: d.toLocaleDateString('es-ES', { weekday: 'short' }),
      value: count,
    });
  }

  const ratingColors = ['#10b981', '#22c55e', '#eab308', '#f97316', '#ef4444'];

  return (
    <div className="flex flex-col gap-8 sm:gap-6">
      <div>
        <h1 className="text-2xl font-semibold mb-2 flex items-center gap-3 flex-wrap">
          Hola, {name}
          {trialDaysLeft > 0 ? (
            <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 uppercase tracking-wider whitespace-nowrap">
              Prueba · {trialDaysLeft} día{trialDaysLeft !== 1 ? 's' : ''}
            </span>
          ) : plan === 'pro' ? (
            <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Pro
            </span>
          ) : (
            <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Gratis
            </span>
          )}
        </h1>
        <p className="text-sm text-neutral-500">Aquí tienes el resumen de tu actividad</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Negocios', value: totalBusinesses, color: 'blue' },
          { label: 'Clientes', value: totalCustomers, color: 'violet' },
          { label: 'Invitados', value: invited, color: 'amber' },
          { label: 'Completados', value: completed, color: 'emerald' },
        ].map((s) => (
          <div key={s.label} className={`${nCard} flex flex-col gap-1.5 p-5`}>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${indicator[s.color]}`} />
              <span className="text-[11px] sm:text-xs text-neutral-500 font-medium">{s.label}</span>
            </div>
            <span className="text-2xl sm:text-3xl font-bold">{s.value}</span>
          </div>
        ))}
      </div>

      {/* Conversion + Rating + Daily */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-4">
        {/* Conversion */}
        <div className={`${nCard} flex flex-col gap-4 p-5 sm:p-6`}>
          <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Conversión</span>
          <div className="flex flex-col gap-3">
            <div className="flex items-baseline gap-2">
              {conversionRate !== null ? (
                <>
                  <span className="text-4xl font-bold">{conversionRate}%</span>
                  <span className="text-xs text-neutral-400">{completed} completados / {invited} invitados</span>
                </>
              ) : (
                <>
                  <span className="text-4xl font-bold text-neutral-300">&mdash;</span>
                  <span className="text-xs text-neutral-400">
                    {completed > 0
                      ? `${completed} completados sin invitación`
                      : 'Envía tu primera invitación'}
                  </span>
                </>
              )}
            </div>
            {conversionRate !== null && (
              <div className="w-full h-2 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden shadow-[inset_1px_1px_2px_#d4d4d4,inset_-1px_-1px_2px_#ffffff] dark:shadow-[inset_1px_1px_2px_#0c0c0c,inset_-1px_-1px_2px_#222222]">
                <div
                  className="h-full bg-neutral-950 dark:bg-neutral-100 rounded-full transition-all"
                  style={{ width: `${conversionRate}%` }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Average rating */}
        <div className={`${nCard} flex flex-col gap-4 p-5 sm:p-6`}>
          <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Valoración media</span>
          <div className="flex flex-col gap-3">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold">{avgRating}</span>
              <span className="text-lg" style={{ color: '#f59e0b' }}>{'★'.repeat(Math.round(Number(avgRating) || 0))}</span>
              <span className="text-xs text-neutral-400">
                {googleAvg ? `(${googleTotal} en Google)` : `(${allCustomers.filter((c) => c.rating != null).length} reseña${allCustomers.filter((c) => c.rating != null).length !== 1 ? 's' : ''})`}
              </span>
            </div>
            {ratingDist.length > 0 && (
            <div className="flex flex-col gap-1">
              {ratingDist.map((r, i) => {
                const maxVal = Math.max(...ratingDist.map((d) => d.value), 1);
                return (
                  <div key={r.label} className="flex items-center gap-2 text-xs">
                    <span className="w-3 text-neutral-500">{r.label}</span>
                    <span style={{ color: ratingColors[i] }}>★</span>
                    <div className="flex-1 h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden shadow-[inset_1px_1px_2px_#d4d4d4,inset_-1px_-1px_2px_#ffffff] dark:shadow-[inset_1px_1px_2px_#0c0c0c,inset_-1px_-1px_2px_#222222]">
                      <div className="h-full rounded-full" style={{ width: `${(r.value / maxVal) * 100}%`, backgroundColor: ratingColors[i] }} />
                    </div>
                    <span className="w-5 text-neutral-400 text-right">{r.value}</span>
                  </div>
                );
              })}
            </div>
            )}
          </div>
        </div>

        {/* Daily reviews */}
        <div className={`${nCard} flex flex-col gap-4 p-5 sm:p-6`}>
          <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Reseñas (7 días)</span>
          <ChartLine
            data={dailyData}
            height={180}
            color="#6366f1"
          />
        </div>
      </div>

      {/* Business list */}
      {totalBusinesses === 0 ? (
        <div className={`${nCard} p-6 sm:p-8`}>
          <p className="text-sm text-neutral-400 text-center py-12">Crea tu primer negocio para empezar a recibir reseñas</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-neutral-500">Tus negocios</h2>
          {businesses.map((b) => (
            <Link key={b.id} href={`/business/${b.id}`} className={`${nCard} flex items-center justify-between px-5 py-4 sm:py-5 transition-shadow hover:shadow-[-5px_-5px_10px_#ffffff,5px_5px_10px_#c0c0c0] dark:hover:shadow-[-5px_-5px_10px_#2a2a2a,5px_5px_10px_#0a0a0a]`}>
              <div>
                <span className="font-medium">{b.name}</span>
                <span className="text-xs text-neutral-400 ml-3">{b._count.customers} clientes</span>
              </div>
              <span className="text-xs text-neutral-300">&rarr;</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
