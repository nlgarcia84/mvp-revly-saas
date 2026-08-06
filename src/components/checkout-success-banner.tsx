'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Button from '@/components/ui/button';

type PlanKey = 'avanzado' | 'pro';

const PLAN_BENEFITS: Record<PlanKey, { title: string; items: string[]; quickStart: { title: string; description: string; href: string }[] }> = {
  avanzado: {
    title: 'Avanzado',
    items: [
      'Hasta 5 negocios',
      'Google Business Profile (todas las reseñas)',
      'Respuestas con IA a reseñas',
      'Filtros avanzados de reseñas',
      'Alertas de reseñas negativas',
      'Importar clientes por CSV',
    ],
    quickStart: [
      {
        title: 'Conecta Google Business Profile',
        description: 'Vincula tu negocio para ver todas las reseñas de Google y responder con IA.',
        href: '/business',
      },
      {
        title: 'Importa tus clientes',
        description: 'Sube un CSV con tus clientes existentes y empieza a gestionarlos.',
        href: '/business',
      },
      {
        title: 'Configura alertas',
        description: 'Recibe notificaciones cuando lleguen reseñas negativas para actuar rápido.',
        href: '/business',
      },
    ],
  },
  pro: {
    title: 'Pro',
    items: [
      'Negocios ilimitados',
      'Dashboard avanzado con gráficos',
      'Informes PDF del plan de acción',
      'QR y email personalizados',
      'Valoraciones con estrellas',
      'Analytics completo',
    ],
    quickStart: [
      {
        title: 'Genera tu primer informe',
        description: 'Crea un PDF con el plan de acción basado en tus reseñas y analíticas.',
        href: '/business',
      },
      {
        title: 'Personaliza tu QR',
        description: 'Diseña el código QR con los colores y logo de tu marca.',
        href: '/business',
      },
      {
        title: 'Explora el analytics avanzado',
        description: 'Accede a gráficos detallados de satisfacción, retención y tendencias.',
        href: '/dashboard',
      },
    ],
  },
};

export default function CheckoutSuccessBanner({ currentPlan }: { currentPlan: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);

  const isCheckoutSuccess = searchParams.get('checkout') === 'success';
  const urlPlan = searchParams.get('plan') as PlanKey | null;
  const plan = (isCheckoutSuccess ? (urlPlan || currentPlan) : null) as PlanKey | null;
  const benefits = plan ? PLAN_BENEFITS[plan] : null;

  useEffect(() => {
    if (dismissed && isCheckoutSuccess) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete('checkout');
      params.delete('plan');
      const qs = params.toString();
      router.replace(qs ? `?${qs}` : window.location.pathname);
    }
  }, [dismissed, isCheckoutSuccess, searchParams, router]);

  if (!isCheckoutSuccess || !benefits || dismissed) return null;

  return (
    <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/40 dark:to-emerald-900/30 border border-emerald-200 dark:border-emerald-800/50 rounded-xl p-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-300/20 dark:bg-emerald-700/20 rounded-bl-full" />

      <div className="relative flex flex-col gap-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              ¡Ya tienes Revly {benefits.title}!
            </h2>
            <p className="text-sm text-emerald-700 dark:text-emerald-400 mt-1">
              Tu plan se ha activado correctamente. Esto es lo que incluye:
            </p>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-emerald-600 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-800/50 transition-colors"
            aria-label="Cerrar"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {benefits.items.map((item) => (
            <li key={item} className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
              <svg className="w-4 h-4 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {item}
            </li>
          ))}
        </ul>

        <div className="border-t border-emerald-200 dark:border-emerald-800/50 pt-4">
          <h3 className="text-sm font-semibold text-emerald-800 dark:text-emerald-300 mb-3">
            Empieza ahora
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {benefits.quickStart.map((step) => (
              <a
                key={step.title}
                href={step.href}
                className="flex flex-col gap-1 p-3 rounded-lg bg-white/60 dark:bg-emerald-950/30 hover:bg-white dark:hover:bg-emerald-950/50 transition-colors border border-emerald-200/50 dark:border-emerald-800/30"
              >
                <span className="text-sm font-medium text-emerald-800 dark:text-emerald-300">{step.title}</span>
                <span className="text-xs text-emerald-600 dark:text-emerald-500">{step.description}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
