import { getBusinessBySlug } from '@/actions/business';
import PublicCustomerAccess from '@/components/public-customer-access';
import { parseReservationConfig } from '@/lib/reservations';
import Button from '@/components/ui/button';
import { notFound } from 'next/navigation';

export default async function PublicBusinessPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const business = await getBusinessBySlug(slug);
  if (!business) notFound();
  return <main className="min-h-screen bg-stone-50 p-4 text-stone-900 dark:bg-neutral-950 dark:text-neutral-100">
    <section className="mx-auto mt-8 w-full max-w-md rounded-xl border border-stone-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
      <h1 className="mb-3 text-xl font-semibold">{business.name}</h1>
      <p className="mb-4 text-sm text-stone-600 dark:text-neutral-400">Cada 5 puntos consigues un 10% de descuento. Verifica tu email para acceder a tu tarjeta.</p>
      <PublicCustomerAccess slug={slug} />
      {parseReservationConfig(business.reservationConfig).enabled && <Button as="link" variant="secondary" href={`/${encodeURIComponent(slug)}/reservas`} className="mt-5 w-full">Reservar mesa</Button>}
    </section>
  </main>;
}
