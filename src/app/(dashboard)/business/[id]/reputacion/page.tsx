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
  const { id, business, features } = useBusiness();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold">Reputación</h1>
        <p className="text-xs sm:text-sm text-neutral-500 mt-1">
          Reseñas de Google y propuestas de mejora.
        </p>
      </div>

      <GoogleReviewsSection
        businessId={id}
        googleLink={business?.googleLink ?? ''}
        features={features}
      />
    </div>
  );
};

export default ReputacionPage;
