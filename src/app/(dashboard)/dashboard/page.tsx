import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/db';
import Link from 'next/link';
import GoogleReviewsSection from '@/components/google-reviews-section';
import { ChartBar } from '@/components/ui/chart';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id ?? '';
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { subscription: true },
  });
  const name = user?.name ?? '';
  const plan = user?.subscription?.plan ?? 'free';

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
  const invited = allCustomers.filter((c) => c.status === 'invited').length;
  const completed = allCustomers.filter((c) => c.status === 'completed').length;
  const conversionRate = invited > 0 ? Math.round((completed / invited) * 100) : 0;
  const rated = allCustomers.filter((c) => c.rating != null);
  const avgRating = rated.length > 0
    ? (rated.reduce((s, c) => s + (c.rating ?? 0), 0) / rated.length).toFixed(1)
    : '—';

  const ratingDist = [5, 4, 3, 2, 1].map((n) => ({
    label: String(n),
    value: rated.filter((c) => c.rating === n).length,
  }));

  const completedCustomers = allCustomers.filter((c) => c.status === 'completed');

  // Daily reviews (last 7 days)
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
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold mb-1 flex items-center gap-3">
          Hola, {name}
          <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
            {plan === 'free' ? 'Gratis' : 'Pro'}
          </span>
        </h1>
        <p className="text-sm text-neutral-500">Aquí tienes el resumen de tu actividad</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 sm:p-5 shadow-sm flex flex-col gap-0.5">
          <span className="text-[11px] sm:text-xs text-neutral-500 font-medium">Negocios</span>
          <span className="text-2xl sm:text-3xl font-bold">{totalBusinesses}</span>
        </div>
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 sm:p-5 shadow-sm flex flex-col gap-0.5">
          <span className="text-[11px] sm:text-xs text-neutral-500 font-medium">Clientes</span>
          <span className="text-2xl sm:text-3xl font-bold">{totalCustomers}</span>
        </div>
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 sm:p-5 shadow-sm flex flex-col gap-0.5">
          <span className="text-[11px] sm:text-xs text-neutral-500 font-medium">Invitados</span>
          <span className="text-2xl sm:text-3xl font-bold">{invited}</span>
        </div>
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 sm:p-5 shadow-sm flex flex-col gap-0.5">
          <span className="text-[11px] sm:text-xs text-neutral-500 font-medium">Completados</span>
          <span className="text-2xl sm:text-3xl font-bold">{completed}</span>
        </div>
      </div>

      {/* Conversion + Rating + Daily */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Conversion */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 sm:p-6 shadow-sm flex flex-col gap-3">
          <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Conversión</span>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold">{conversionRate}%</span>
            <span className="text-xs text-neutral-400">completados / invitados</span>
          </div>
          <div className="w-full h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-neutral-950 dark:bg-neutral-100 rounded-full transition-all"
              style={{ width: `${conversionRate}%` }}
            />
          </div>
        </div>

        {/* Average rating */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 sm:p-6 shadow-sm flex flex-col gap-3">
          <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Valoración media</span>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold">{avgRating}</span>
            <span className="text-lg" style={{ color: '#f59e0b' }}>{'★'.repeat(Math.round(Number(avgRating) || 0))}</span>
            <span className="text-xs text-neutral-400">({rated.length} reseña{rated.length !== 1 ? 's' : ''})</span>
          </div>
          <div className="flex flex-col gap-1">
            {ratingDist.map((r, i) => {
              const maxVal = Math.max(...ratingDist.map((d) => d.value), 1);
              return (
                <div key={r.label} className="flex items-center gap-2 text-xs">
                  <span className="w-3 text-neutral-500">{r.label}</span>
                  <span style={{ color: ratingColors[i] }}>★</span>
                  <div className="flex-1 h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(r.value / maxVal) * 100}%`, backgroundColor: ratingColors[i] }} />
                  </div>
                  <span className="w-5 text-neutral-400 text-right">{r.value}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Daily reviews */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 sm:p-6 shadow-sm flex flex-col gap-4">
          <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Reseñas (7 días)</span>
          <ChartBar
            data={dailyData}
            bars={[{ key: 'value', color: '#0a0a0a', name: 'Reseñas' }]}
            height={180}
          />
        </div>
      </div>

      {/* Google Reviews */}
      <GoogleReviewsSection />

      {/* Business list */}
      {totalBusinesses === 0 ? (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 shadow-sm">
          <p className="text-sm text-neutral-400 text-center py-12">Crea tu primer negocio para empezar a recibir reseñas</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-neutral-500">Tus negocios</h2>
          {businesses.map((b) => (
            <Link key={b.id} href={`/business/${b.id}`} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm flex items-center justify-between px-5 py-4 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors">
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