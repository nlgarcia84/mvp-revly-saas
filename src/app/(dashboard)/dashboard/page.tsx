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
    prisma.business.findMany({
      where: { userId },
      select: {
        createdAt: true,
        googleBusinessAccessToken: true,
        instagramAccessToken: true,
        facebookAccessToken: true,
        _count: { select: { customers: true } },
      },
    }),
  ]);
  const name =
    user?.name ||
    authUser.user_metadata?.full_name ||
    authUser.user_metadata?.name ||
    '';
  const totalCustomers = businesses.reduce(
    (total, business) => total + business._count.customers,
    0,
  );
  const connectedChannels = businesses.reduce(
    (total, business) =>
      total +
      Number(Boolean(business.googleBusinessAccessToken)) +
      Number(Boolean(business.instagramAccessToken)) +
      Number(Boolean(business.facebookAccessToken)),
    0,
  );
  const latestBusiness = businesses.reduce<Date | null>(
    (latest, business) =>
      !latest || business.createdAt > latest ? business.createdAt : latest,
    null,
  );
  const trialLabel =
    planData.plan === 'pro'
      ? 'Plan Pro activo'
      : planData.trialDaysLeft > 0
        ? `${planData.trialDaysLeft} día${planData.trialDaysLeft !== 1 ? 's' : ''} de prueba`
        : 'Plan gratuito';

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

      <section aria-label="Información general">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Información general</h2>
            <p className="mt-0.5 text-xs text-neutral-500">
              Una vista rápida del estado de tu cuenta.
            </p>
          </div>
          {latestBusiness && (
            <p className="hidden text-xs text-neutral-500 sm:block">
              Último negocio añadido:{' '}
              {latestBusiness.toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            {
              label: 'Negocios registrados',
              value: businesses.length,
              detail: 'Locales gestionados',
              color: 'text-violet-300',
            },
            {
              label: 'Clientes acumulados',
              value: totalCustomers,
              detail: 'En todos tus negocios',
              color: 'text-sky-300',
            },
            {
              label: 'Conexiones activas',
              value: connectedChannels,
              detail: 'Google, Instagram o Facebook',
              color: 'text-emerald-300',
            },
            {
              label: 'Estado del plan',
              value: trialLabel,
              detail: 'Suscripción actual',
              color: 'text-amber-300',
            },
          ].map((item) => (
            <div
              key={item.label}
              className={`${nCard} group min-h-[128px] p-4 sm:p-5`}
            >
              <div className="flex h-full flex-col justify-between gap-4">
                <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">
                  {item.label}
                </p>
                <div>
                  <p className={`text-xl font-semibold tracking-tight ${item.color}`}>
                    {item.value}
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-neutral-500">
                    {item.detail}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
