import { getPublicCustomer } from '@/actions/customers';
import { claimTicketPoint } from '@/actions/points';
import { notFound, redirect } from 'next/navigation';
import Button from '@/components/ui/button';

// ─────────────────────────────────────────────────────
// CustomerProfilePage (Server Component)
// ─────────────────────────────────────────────────────
// Página pública del cliente: revly.es/{slug}/customer/{customerId}
//
// Aquí el cliente puede ver:
//   - Sus puntos acumulados
//   - Su progreso hacia el próximo descuento (cada 5 puntos)
//   - Su código de descuento alfanumérico (lo enseña en caja)
//   - Cuántos descuentos ha conseguido hasta ahora
//   - Sumar puntos con el código del ticket del kiosko
//
// El cliente muestra o dicta su código en caja y el empresario
// lo canjea desde el dashboard.
//
// No requiere autenticación. Es una página pública para
// que el cliente pueda consultar sus puntos desde casa.
// ─────────────────────────────────────────────────────
const CustomerProfilePage = async ({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; customerId: string }>;
  searchParams: Promise<{ ticket?: string; ticketError?: string }>;
}) => {
  const { slug, customerId } = await params;
  const { ticket, ticketError } = await searchParams;
  const customer = await getPublicCustomer(customerId, slug);

  if (!customer) {
    notFound();
  }

  const ticketPlaceholder = (customer as any).ticketFormat || 'Nº de ticket';
  const puntos = customer.points;
  const descuentosConseguidos = Math.floor(puntos / 5);
  const puntosSiguiente = 5 - (puntos % 5);
  const porcentajeProgreso = ((puntos % 5) / 5) * 100;

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950 p-4 flex flex-col items-center">
      <div className="w-full max-w-md flex flex-col gap-6">
        {/* ── Cabecera: nombre del negocio ──────────── */}
        <div className="text-center pt-8">
          <p className="text-xs text-neutral-400 uppercase tracking-wider mb-1">
            Programa de puntos
          </p>
          <h1 className="text-xl font-semibold">{customer.businessName}</h1>
        </div>

        {/* ── Tarjeta: puntos acumulados ────────────── */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm p-6 text-center">
          <p className="text-xs text-neutral-400 mb-1">Tus puntos</p>
          <p className="text-5xl font-bold text-neutral-950 dark:text-neutral-100 mb-2">
            {puntos}
          </p>
          <p className="text-sm text-neutral-500">
            Cada 5 puntos consigues un <strong>10% de descuento</strong>
          </p>
        </div>

        {/* ── Tarjeta: progreso al próximo descuento ── */}
        {/* Si puntos >= 5 muestra "¡Descuento conseguido!"
            Si no, muestra barra de progreso + cuántos faltan */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm p-6">
          <h2 className="text-sm font-semibold mb-3">Progreso</h2>

          {puntosSiguiente > 0 ? (
            <>
              <div className="flex justify-between text-xs text-neutral-500 mb-2">
                <span>Próximo descuento: 10%</span>
                <span>{puntos % 5} / 5 puntos</span>
              </div>
              <div className="w-full h-2.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-neutral-950 dark:bg-neutral-100 rounded-full transition-all duration-500"
                  style={{ width: `${porcentajeProgreso}%` }}
                />
              </div>
              <p className="text-xs text-neutral-400 mt-2">
                Te faltan <strong>{puntosSiguiente}</strong> punto{puntosSiguiente !== 1 ? 's' : ''} para tu próximo descuento
              </p>
            </>
          ) : (
            <div className="text-center py-2">
              <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                ¡Descuento conseguido! 🎉
              </p>
              <p className="text-xs text-neutral-400 mt-1">
                Tienes un 10% de descuento esperándote. Presenta tu código en el negocio.
              </p>
            </div>
          )}

          {descuentosConseguidos > 0 && (
            <p className="text-xs text-neutral-400 mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-700">
              Has conseguido <strong>{descuentosConseguidos}</strong> descuento
              {descuentosConseguidos !== 1 ? 's' : ''} hasta ahora
            </p>
          )}
        </div>

        {/* ── Tarjeta: código de descuento ───────────── */}
        {/* El cliente muestra o dicta este código en caja.
            El empresario lo canjea desde el dashboard. */}
        {customer.discountCode && (
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm p-6 text-center">
            <h2 className="text-sm font-semibold mb-1">Tu código de descuento</h2>
            <p className="text-xs text-neutral-400 mb-4">
              Muestra o dicta este código en caja
            </p>

            <p className="text-2xl font-bold tracking-widest text-neutral-950 dark:text-neutral-100 font-mono">
              {customer.discountCode}
            </p>
          </div>
        )}

        {/* ── Tarjeta: sumar punto con el ticket ────── */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm p-6">
          <h2 className="text-sm font-semibold mb-1">Suma puntos con tu ticket</h2>
          <p className="text-xs text-neutral-400 mb-3">
            Introduce el número de tu ticket del kiosko para ganar 1 punto. Solo
            puedes sumar 1 punto al día.
          </p>

          {ticket && (
            <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium mb-3">
              ¡Has ganado 1 punto! 🎉
            </p>
          )}
          {ticketError && (
            <p className="text-sm text-red-500 mb-3">{ticketError}</p>
          )}

          <form
            action={async (formData: FormData) => {
              'use server';
              const code = formData.get('ticket') as string;
              if (!code) {
                redirect(`/${slug}/customer/${customerId}?ticketError=Introduce el número de tu ticket`);
              }
              const result = await claimTicketPoint(customerId, slug, code);
              if (!result.success) {
                redirect(`/${slug}/customer/${customerId}?ticketError=${encodeURIComponent(result.error)}`);
              }
              redirect(`/${slug}/customer/${customerId}?ticket=1`);
            }}
            className="flex gap-2"
          >
            <input
              name="ticket"
              type="text"
              required
              placeholder={ticketPlaceholder}
              className="flex-1 min-w-0 px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-md text-sm text-neutral-950 dark:text-neutral-100 bg-white dark:bg-neutral-800 outline-none transition-all duration-150 focus:border-neutral-950 dark:focus:border-neutral-400 focus:shadow-[0_0_0_2px_rgba(0,0,0,0.05)] placeholder:text-neutral-400"
            />
            <Button type="submit" variant="secondary">
              Sumar
            </Button>
          </form>
        </div>

        {/* ── Enlace para volver al inicio ──────────── */}
        <div className="text-center pb-8">
          <Button as="a" variant="secondary" href={`/${slug}`}>
            Volver al inicio
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CustomerProfilePage;
