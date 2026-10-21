'use client';

// ─── Sección: Reputación ─────────────────────────────
// Reseñas de Google y propuestas de mejora generadas por IA.
// GoogleReviewsSection ya monta SmartAnalyticsSection internamente,
// así que esta página solo aporta el contexto y el aviso de que
// sin Business Profile conectado solo se ven 5 reseñas.
// ────────────────────────────────────────────────────

import GoogleReviewsSection from '@/components/google-reviews-section';
import { useBusiness } from '@/components/business-context';

const ReputacionPage = () => {
  const { id, business, features, loading, error, reload } = useBusiness();

  // Las acciones de reseñas necesitan un negocio autorizado. Esperamos a
  // que el contexto termine de cargar para no dispararlas con datos nulos
  // durante el primer render (especialmente en producción).
  if (loading) {
    return (
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-5">
        <p className="text-sm text-neutral-400">Cargando negocio...</p>
      </div>
    );
  }

  if (error || !business) {
    return (
      <div className="rounded-xl border border-red-200 dark:border-red-900/50 p-5">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-red-600 dark:text-red-400">
            {error ?? 'No se pudo cargar el negocio.'}
          </p>
          <button
            onClick={reload}
            className="shrink-0 text-xs px-3 py-1.5 rounded-md border border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:border-neutral-950 dark:hover:border-neutral-100 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 stagger">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold">Reputación</h1>
        <p className="text-xs sm:text-sm text-neutral-500 mt-1">
          Reseñas de Google y propuestas de mejora.
        </p>
      </div>

      <GoogleReviewsSection
        businessId={id}
        googleLink={business.googleLink ?? ''}
        features={features}
      />
    </div>
  );
};

export default ReputacionPage;
