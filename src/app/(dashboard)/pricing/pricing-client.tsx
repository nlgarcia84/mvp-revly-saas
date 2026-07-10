'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/button';
import { nCard } from '@/components/ui/card';
import BackButton from '@/components/back-button';

const plans = [
  {
    id: 'basico',
    name: 'Básico',
    price: '0 €',
    period: '',
    features: [
      '1 negocio',
      'Clientes ilimitados',
      'Gestión de clientes con filtros',
      'Sistema de puntos y descuentos',
      'Canje en caja con QR + PIN',
      'Facturas para sumar puntos',
      'Reseñas de Google (últimas 5)',
      'Invitaciones por email y WhatsApp',
      'Analítica básica',
    ],
  },
  {
    id: 'avanzado',
    name: 'Avanzado',
    price: '9 €',
    period: '/mes',
    features: [
      'Hasta 5 negocios',
      'Clientes ilimitados',
      'Todo lo del plan Básico',
      'Google Business Profile (todas las reseñas)',
      'IA en respuestas a reseñas',
      'Filtros avanzados de reseñas',
      'Alertas de reseñas negativas',
      'Reseñas sin responder',
      'Importar clientes por CSV',
    ],
    priceId: 'price_1R41NhGGc0u0LW2eH0y6Q3mh',
    popular: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '19 €',
    period: '/mes',
    features: [
      'Negocios ilimitados',
      'Clientes ilimitados',
      'Todo lo del plan Avanzado',
      'Dashboard avanzado con gráficos',
      'Informes PDF de plan de acción',
      'QR y email personalizado',
      'Valoraciones con estrellas',
      'Analytics completo',
    ],
    priceId: 'price_PRO_PLACEHOLDER',
  },
];

const planDetails: Record<string, { badge: string; btnFree: string; btnPaid: string }> = {
  basico: { badge: '', btnFree: 'Tu plan actual', btnPaid: 'Downgrade' },
  avanzado: { badge: 'Más popular', btnFree: 'Mejorar a Avanzado', btnPaid: 'Tu plan actual' },
  pro: { badge: '', btnFree: 'Mejorar a Pro', btnPaid: 'Tu plan actual' },
};

export default function PricingClient({ planData }: { planData: { plan: string; trialDaysLeft: number; status: string } }) {
  const [loading, setLoading] = useState<string | null>(null);
  const router = useRouter();

  const handleCheckout = async (planId: string, priceId?: string) => {
    if (!priceId) return;
    setLoading(planId);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId, plan: planId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert('Error: ' + (data.error || 'desconocido'));
      }
    } catch {
      alert('Error de conexión');
    }
    setLoading(null);
  };

  const isOnTrial = planData.trialDaysLeft > 0;
  const currentPlan = planData.plan;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <BackButton href="/dashboard" />
        <h1 className="text-2xl font-semibold mt-1 mb-1">Planes</h1>
        <p className="text-sm text-neutral-500">
          {isOnTrial
            ? `Estás en periodo de prueba. Te quedan ${planData.trialDaysLeft} día${planData.trialDaysLeft !== 1 ? 's' : ''} con todas las funciones Pro.`
            : 'Elige el plan que mejor se adapte a tu negocio'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl">
        {plans.map((plan) => {
          const isCurrent = plan.id === currentPlan || (isOnTrial && plan.id === 'pro');
          const details = planDetails[plan.id];

          return (
            <div
              key={plan.id}
              className={`${nCard} p-6 flex flex-col gap-5 ${
                plan.popular
                  ? 'ring-1 ring-neutral-950/10 dark:ring-neutral-100/20'
                  : ''
              }`}
            >
              {details.badge && (
                <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-950 dark:text-neutral-100">
                  {details.badge}
                </span>
              )}
              <div>
                <h2 className="text-lg font-semibold">{plan.name}</h2>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className="text-sm text-neutral-400">{plan.period}</span>
                </div>
              </div>
              <ul className="flex flex-col gap-2 flex-1">
                {plan.features.map((f) => (
                  <li
                    key={f}
                    className="text-sm text-neutral-600 dark:text-neutral-400 flex items-center gap-2"
                  >
                    <svg
                      className="w-4 h-4 shrink-0"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                variant={plan.popular ? 'primary' : 'secondary'}
                className="w-full"
                disabled={isCurrent || loading === plan.id}
                onClick={() => handleCheckout(plan.id, plan.priceId)}
              >
                {loading === plan.id
                  ? 'Procesando…'
                  : isCurrent
                    ? isOnTrial && plan.id === 'pro'
                      ? `Prueba (${planData.trialDaysLeft} día${planData.trialDaysLeft !== 1 ? 's' : ''})`
                      : 'Tu plan actual'
                    : plan.price
                      ? `Mejorar a ${plan.name}`
                      : 'Downgrade'}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
