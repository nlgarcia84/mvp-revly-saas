import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/db';
import { ChartLine } from '@/components/ui/chart';
import { getAllGoogleReviews } from '@/actions/google-reviews';
import { getPlan } from '@/lib/subscription';
import { nCard } from '@/components/ui/card';
import BusinessList from '@/components/business-list';
import AnimatedCounter from '@/components/ui/animated-counter';

const iconColor: Record<string, string> = {
  blue: 'text-blue-500',
  violet: 'text-violet-500',
  amber: 'text-amber-500',
  emerald: 'text-emerald-500',
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id ?? '';
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { subscription: true },
  });
  const name = user?.name || session?.user?.user_metadata?.full_name || session?.user?.user_metadata?.name || '';
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

  // ── Datos de Google Reviews ───────────────────
  // getAllGoogleReviews devuelve las reseñas de
  // Google Places API para todos los negocios del
  // usuario. La usamos para la valoración media del
  // dashboard y para extraer las reseñas negativas.
  let googleAvg: string | null = null;
  let googleTotal = 0;
  let googleData: Awaited<ReturnType<typeof getAllGoogleReviews>> = [];
  try {
    googleData = await getAllGoogleReviews();
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

  // ── Reseñas negativas de Google agrupadas ────
  // Recorremos las reseñas que devuelve Google
  // Places API y extraemos las que tienen valoración
  // baja (< 4), agrupándolas por negocio para
  // mostrarlas en la card de alertas.
  const negativeByBusiness = new Map<string, { name: string; count: number; samples: string[] }>();
  for (const biz of googleData) {
    if (!biz.reviews) continue;
    for (const rev of biz.reviews) {
      if (rev.rating < 4) {
        const key = biz.businessId;
        if (!negativeByBusiness.has(key)) {
          negativeByBusiness.set(key, { name: biz.businessName, count: 0, samples: [] });
        }
        const entry = negativeByBusiness.get(key)!;
        entry.count++;
        if (rev.text && entry.samples.length < 3) entry.samples.push(rev.text);
      }
    }
  }

  const ratingColors = ['#10b981', '#22c55e', '#eab308', '#f97316', '#ef4444'];

  return (
    <div className="flex flex-col gap-8 sm:gap-6">
      <div className={`${nCard} p-5 sm:p-6 bg-gradient-to-br from-white to-neutral-50 dark:from-neutral-900 dark:to-neutral-950`}>
        <h1 className="text-2xl font-semibold mb-2 flex items-center gap-3 flex-wrap">
          {name ? `Hola, ${name}` : 'Hola'}
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
          { label: 'Negocios', value: totalBusinesses, color: 'blue', icon: 'M3 21h18M3 7v14h18V7M3 7l9-5 9 5' },
          { label: 'Clientes', value: totalCustomers, color: 'violet', icon: 'M12 4a4 4 0 100 8 4 4 0 000-8zM4 20c0-4 3.58-8 8-8s8 4 8 8' },
          { label: 'Invitados', value: invited, color: 'amber', icon: 'M22 12h-4l-3 9L9 3l-3 9H2' },
          { label: 'Completados', value: completed, color: 'emerald', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
        ].map((s) => (
          <div key={s.label} className={`${nCard} flex flex-col gap-2 p-5 transition-shadow hover:shadow-[-5px_-5px_10px_#ffffff,5px_5px_10px_#c0c0c0] dark:hover:shadow-[-5px_-5px_10px_#2a2a2a,5px_5px_10px_#0a0a0a]`}>
            <div className="flex items-center gap-2">
              <svg className={`w-4 h-4 ${iconColor[s.color]}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d={s.icon} />
              </svg>
              <span className="text-[11px] sm:text-xs text-neutral-500 font-medium">{s.label}</span>
            </div>
            <span className="text-2xl sm:text-3xl font-bold"><AnimatedCounter value={s.value} /></span>
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
              <div className="w-full h-3 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden shadow-[inset_1px_1px_2px_#d4d4d4,inset_-1px_-1px_2px_#ffffff] dark:shadow-[inset_1px_1px_2px_#0c0c0c,inset_-1px_-1px_2px_#222222]">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${conversionRate}%`, background: 'linear-gradient(90deg, #0a0a0a, #525252)' }}
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

      {/* Reseñas negativas */}
      <div className={`${nCard} p-5 sm:p-6 ${negativeByBusiness.size > 0 ? 'bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/40 dark:to-red-900/30 animate-pulse-red' : ''}`}>
        <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">
          Feed de reseñas negativas por negocio
        </h2>
        {negativeByBusiness.size === 0 ? (
          <div className="flex items-center gap-2 text-sm text-emerald-600">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Sin reseñas negativas — todo bien
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {Array.from(negativeByBusiness.entries()).map(([bizId, biz]) => (
              <div key={bizId} className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-sm font-medium">{biz.name}</span>
                  <span className="text-xs text-neutral-400 ml-2">
                    · {biz.count} negativa{biz.count !== 1 ? 's' : ''}
                  </span>
                  {biz.samples[0] && (
                    <p className="text-xs text-neutral-400 mt-1 truncate max-w-[300px]">
                      {biz.samples[0]}
                    </p>
                  )}
                </div>
                <span className="text-lg shrink-0 text-red-400">{'★'.repeat(Math.min(3, biz.count > 3 ? 3 : 1))}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Business list */}
      <BusinessList businesses={businesses} />
    </div>
  );
}
