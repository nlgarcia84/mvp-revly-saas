import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/db';
import { ChartLine } from '@/components/ui/chart';
import { getAllGoogleReviews } from '@/actions/google-reviews';
import { getPlan } from '@/lib/subscription';
import { nCard } from '@/components/ui/card';
import BusinessList from '@/components/business-list';
import AnimatedCounter from '@/components/ui/animated-counter';
import CheckoutSuccessBanner from '@/components/checkout-success-banner';

const iconColor: Record<string, string> = {
  blue: 'text-neutral-700 dark:text-neutral-300',
  violet: 'text-neutral-700 dark:text-neutral-300',
  amber: 'text-neutral-700 dark:text-neutral-300',
  emerald: 'text-neutral-700 dark:text-neutral-300',
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  // El proxy protege esta ruta, pero el guard también debe existir aquí:
  // los Server Components pueden invocarse sin pasar por el proxy durante
  // una navegación/renderizado. Evita consultar Prisma con un id vacío.
  if (!authUser) redirect('/sign-in');

  const userId = authUser.id;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { subscription: true },
  });
  const name = user?.name || authUser?.user_metadata?.full_name || authUser?.user_metadata?.name || '';
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
    if (googleData.length > 0) {
      const ratings = googleData.map((g) => g.rating).filter((r) => r > 0);
      if (ratings.length > 0) {
        googleAvg = (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1);
        googleTotal = googleData.reduce((s, g) => s + g.userRatingsTotal, 0);
      }
    }
  } catch (error) {
    console.error('No se pudieron cargar las reseñas de Google para el dashboard:', error);
  }
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

  // ── Reseñas sin responder ─────────────────────
  // Recorremos las reseñas y extraemos aquellas
  // que tienen hasReply === false (solo disponible
  // si el negocio tiene Business Profile conectado).
  const unrepliedByBusiness = new Map<string, { name: string; count: number; samples: string[] }>();
  for (const biz of googleData) {
    if (!biz.reviews) continue;
    for (const rev of biz.reviews) {
      if (rev.hasReply === false) {
        const key = biz.businessId;
        if (!unrepliedByBusiness.has(key)) {
          unrepliedByBusiness.set(key, { name: biz.businessName, count: 0, samples: [] });
        }
        const entry = unrepliedByBusiness.get(key)!;
        entry.count++;
        if (rev.text && entry.samples.length < 3) entry.samples.push(rev.text);
      }
    }
  }

  const ratingColors = ['#10b981', '#22c55e', '#eab308', '#f97316', '#ef4444'];

  return (
    <div className="mx-auto flex w-full max-w-6xl min-w-0 flex-col gap-5 sm:gap-6">
      <div className={`${nCard} p-5 sm:p-6 lg:p-7`}>
        <h1 className="mb-2 flex flex-wrap items-center gap-2.5 text-2xl font-semibold tracking-tight sm:text-3xl">
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

      <Suspense fallback={null}>
        <CheckoutSuccessBanner currentPlan={plan} />
      </Suspense>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {[
          { label: 'Negocios', value: totalBusinesses, color: 'blue', icon: 'M3 21h18M3 7v14h18V7M3 7l9-5 9 5' },
          { label: 'Clientes', value: totalCustomers, color: 'violet', icon: 'M12 4a4 4 0 100 8 4 4 0 000-8zM4 20c0-4 3.58-8 8-8s8 4 8 8' },
          { label: 'Invitados', value: invited, color: 'amber', icon: 'M22 12h-4l-3 9L9 3l-3 9H2' },
          { label: 'Completados', value: completed, color: 'emerald', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
        ].map((s) => (
          <div key={s.label} className={`${nCard} flex min-h-[104px] flex-col justify-between gap-3 p-4 hover:-translate-y-0.5 dark:hover:border-white/20 sm:p-5`}>
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
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Conversion */}
        <div className={`${nCard} flex flex-col gap-4 p-5 sm:p-6`}>
          <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Conversión</span>
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
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
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
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
          color="#525252"
          />
        </div>
      </div>

      {/* Reseñas negativas */}
      <div className={`${nCard} p-5 sm:p-6 ${negativeByBusiness.size > 0 ? 'bg-red-50 dark:bg-red-950/40 animate-pulse-red' : ''}`}>
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
              <div key={bizId} className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-sm font-medium">{biz.name}</span>
                  <span className="text-xs text-neutral-400 ml-2">
                    · {biz.count} negativa{biz.count !== 1 ? 's' : ''}
                  </span>
                  {biz.samples[0] && (
                    <p className="mt-1 max-w-full truncate text-xs text-neutral-400 sm:max-w-[300px]">
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

      {/* Reseñas sin responder */}
      <div className={`${nCard} p-5 sm:p-6`}>
        <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 2L11 13" /><path d="M22 2l-7 20-4-9-9-4 20-7z" />
          </svg>
          Reseñas sin responder
        </h2>
        {unrepliedByBusiness.size === 0 ? (
          <div className="flex items-center gap-2 text-sm text-emerald-600">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Todas las reseñas tienen respuesta
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {Array.from(unrepliedByBusiness.entries()).map(([bizId, biz]) => (
              <div key={bizId} className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-sm font-medium">{biz.name}</span>
                  <span className="text-xs text-neutral-400 ml-2">
                    · {biz.count} sin responder
                  </span>
                  {biz.samples[0] && (
                    <p className="mt-1 max-w-full truncate text-xs text-neutral-400 sm:max-w-[300px]">
                      {biz.samples[0]}
                    </p>
                  )}
                </div>
                <a
                  href={`/business/${bizId}`}
                  className="text-xs font-medium px-3 py-1.5 rounded-md border border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-colors shrink-0"
                >
                  Revisar
                </a>
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
