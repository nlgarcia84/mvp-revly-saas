'use client';

// ─── Sección: Reservas ──────────────────────────────
// Configuración del sistema de reservas y agenda de las
// reservas entrantes de la página pública /{slug}.
// ────────────────────────────────────────────────────

import ReservationsSection from '@/components/reservations-section';
import { useBusiness } from '@/components/business-context';

const ReservasPage = () => {
  const { id, loading } = useBusiness();

  if (loading) {
    return <p className="text-sm text-neutral-500">Cargando…</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold">Reservas</h1>
        <p className="text-xs sm:text-sm text-neutral-500 mt-1">
          Acepta reservas de mesa desde tu página pública y gestiónalas aquí.
        </p>
      </div>

      <ReservationsSection businessId={id} />
    </div>
  );
};

export default ReservasPage;
