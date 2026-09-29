import { getPublicCustomer } from '@/actions/customers';
import { notFound } from 'next/navigation';
import Button from '@/components/ui/button';
import CustomerQR from '@/components/customer-qr';

// ─────────────────────────────────────────────────────
// CustomerProfilePage (Server Component)
// ─────────────────────────────────────────────────────
// Página pública del cliente: revly.es/{slug}/customer/{customerId}
//
// Aquí el cliente puede ver:
//   - Sus puntos acumulados
//   - Su progreso hacia el próximo descuento (cada 5 puntos)
//   - Su código de descuento alfanumérico (lo enseña en caja)
//   - Su QR personal (lo enseña al empleado para sumar puntos)
//
// El cliente muestra su QR en caja y el empleado lo escanea
// para sumarle un punto o canjear la recompensa.
//
// No requiere autenticación. Es una página pública para
// que el cliente pueda consultar sus puntos desde casa.
// ─────────────────────────────────────────────────────
const CustomerProfilePage = async ({
  params,
}: {
  params: Promise<{ slug: string; customerId: string }>;
}) => {
  const { slug, customerId } = await params;
  const customer = await getPublicCustomer(customerId, slug);

  if (!customer) {
    notFound();
  }

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

        {/* ── Tu QR de cliente ───────────────────────── */}
        <CustomerQR qrToken={customer.qrToken} />

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
