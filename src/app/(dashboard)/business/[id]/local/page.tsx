'use client';

// ─── Sección: Mi local ───────────────────────────────
// Dirección, mapa, fotos y horarios de apertura que el negocio
// publica en su página pública de fidelización.
// ────────────────────────────────────────────────────

import StoreLocatorSection from '@/components/store-locator-section';
import { useBusiness } from '@/components/business-context';

const LocalPage = () => {
  const { id, business, reload } = useBusiness();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold">Mi local</h1>
        <p className="text-xs sm:text-sm text-neutral-500 mt-1">
          Dirección, mapa, fotos y horarios de apertura.
        </p>
      </div>

      <StoreLocatorSection
        businessId={id}
        initial={{
          address: business?.address,
          latitude: business?.latitude,
          longitude: business?.longitude,
          openingHours: business?.openingHours,
          photos: business?.photos,
        }}
        onSaved={reload}
      />
    </div>
  );
};

export default LocalPage;
