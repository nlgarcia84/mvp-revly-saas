import { getBusinessBySlug } from '@/actions/business';
import Button from '@/components/ui/button';
import PublicStoreInfo from '@/components/public-store-info';
import ReservationForm from '@/components/reservation-form';
import { parseReservationConfig } from '@/lib/reservations';

// ──────────────────────────────────────────────
// ReservasPage (Server Component)
// Página pública de reservas (revly.es/{slug}/reservas).
//   - Si el negocio tiene reservas activas → formulario.
//   - Si no → aviso con enlace al programa de puntos.
//   - Bloque del local (dirección, mapa y fotos) sin horarios.
// El programa de puntos vive en revly.es/{slug}.
// ──────────────────────────────────────────────
const ReservasPage = async ({
  params,
}: {
  params: Promise<{ slug: string }>;
}) => {
  const { slug } = await params;
  const business = await getBusinessBySlug(slug);

  if (!business) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-100 dark:bg-neutral-950">
        <p className="text-neutral-500">Negocio no encontrado</p>
      </div>
    );
  }

  const config = parseReservationConfig(business.reservationConfig);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-100 dark:bg-neutral-950 p-4">
      {config.enabled ? (
        <>
          <ReservationForm
            slug={slug}
            reservationConfig={business.reservationConfig}
          />
          <a
            href={`/${slug}`}
            className="mt-4 text-xs font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-neutral-100 underline underline-offset-2"
          >
            Ver programa de puntos
          </a>
        </>
      ) : (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm w-full max-w-md p-8 text-center">
          <h1 className="text-xl font-semibold mb-1">Reservas</h1>
          <p className="text-xs text-neutral-400 mb-5">
            {business.name} aún no acepta reservas online. Prueba más adelante.
          </p>
          <Button as="link" variant="secondary" href={`/${slug}`}>
            Ver programa de puntos
          </Button>
        </div>
      )}

      <PublicStoreInfo
        businessName={business.name}
        address={business.address}
        latitude={business.latitude}
        longitude={business.longitude}
        openingHours={business.openingHours}
        photos={business.photos}
      />
    </div>
  );
};

export default ReservasPage;
