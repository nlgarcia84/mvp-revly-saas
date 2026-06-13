'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/button';

const plans = [
  {
    id: 'free',
    name: 'Gratis',
    price: '0 €',
    period: '',
    features: ['1 negocio', 'Clientes ilimitados', 'QR y email', 'Analytics básico'],
    cta: 'Tu plan actual',
    disabled: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '9 €',
    period: '/mes',
    features: [
      'Negocios ilimitados',
      'Clientes ilimitados',
      'QR y email personalizado',
      'Importar CSV',
      'Analytics completo',
      'Valoraciones con estrellas',
    ],
    cta: 'Mejorar a Pro',
    priceId: 'price_1R41NhGGc0u0LW2eH0y6Q3mh',
    popular: true,
  },
];

export default function PricingPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleCheckout = async (priceId: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
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
    setLoading(false);
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold mb-1">Planes</h1>
        <p className="text-sm text-neutral-500">Elige el plan que mejor se adapte a tu negocio</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`bg-white dark:bg-neutral-900 border rounded-xl p-6 shadow-sm flex flex-col gap-5 ${
              plan.popular
                ? 'border-neutral-950 dark:border-neutral-100 ring-1 ring-neutral-950/10 dark:ring-neutral-100/20'
                : 'border-neutral-200 dark:border-neutral-800'
            }`}
          >
            {plan.popular && (
              <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-950 dark:text-neutral-100">
                Más popular
              </span>
            )}
            <div>
              <h2 className="text-lg font-semibold">{plan.name}</h2>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-3xl font-bold">{plan.price}</span>
                <span className="text-sm text-neutral-400">{plan.period}</span>
              </div>
            </div>
            <ul className="flex flex-col gap-2">
              {plan.features.map((f) => (
                <li key={f} className="text-sm text-neutral-600 dark:text-neutral-400 flex items-center gap-2">
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  {f}
                </li>
              ))}
            </ul>
            <Button
              variant={plan.popular ? 'primary' : 'secondary'}
              className="w-full"
              disabled={plan.disabled || loading}
              onClick={() => plan.priceId && handleCheckout(plan.priceId)}
            >
              {loading ? 'Procesando…' : plan.cta}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
