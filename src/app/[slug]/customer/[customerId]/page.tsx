import { getPublicCustomer } from '@/actions/customers';
import { claimInvoice } from '@/actions/invoices';
import { notFound, redirect } from 'next/navigation';
import { headers } from 'next/headers';
import Button from '@/components/ui/button';
import QRCode from 'qrcode';

// ─────────────────────────────────────────────────────
// CustomerProfilePage (Server Component)
// ─────────────────────────────────────────────────────
// Página pública del cliente: revly.es/{slug}/customer/{customerId}
// Aquí el cliente puede ver:
//   - Sus puntos acumulados
//   - Su progreso hacia el próximo descuento (cada 5 puntos)
//   - Su código de descuento con barcode
//   - Cuántos descuentos ha conseguido ya
//
// No requiere autenticación. Es una página pública para
// que el cliente pueda consultar sus puntos desde casa.
// ─────────────────────────────────────────────────────
const CustomerProfilePage = async ({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; customerId: string }>;
  searchParams: Promise<{ invoice?: string; invoiceError?: string }>;
}) => {
  const { slug, customerId } = await params;
  const { invoice, invoiceError } = await searchParams;
  const customer = await getPublicCustomer(customerId, slug);

  if (!customer) {
    notFound();
  }

  const host = (await headers()).get('host') || 'revly.es';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const baseUrl = `${protocol}://${host}`;

  let qrSvg = '';
  if (customer.discountCode) {
    const verifyUrl = `${baseUrl}/${slug}/verificar/${customer.discountCode}`;
    qrSvg = await QRCode.toString(verifyUrl, { type: 'svg', margin: 1, width: 200 });
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

        {/* ── Tarjeta: progreso al próximo descuento ── */}
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

        {/* ── Tarjeta: código de descuento + QR ──────── */}
        {customer.discountCode && (
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm p-6 text-center">
            <h2 className="text-sm font-semibold mb-1">Tu código de descuento</h2>
            <p className="text-xs text-neutral-400 mb-4">
              Muestra este QR en caja para que el empleado lo escanee
            </p>

            {/* QR Code — el empleado lo escanea con la cámara */}
            {qrSvg && (
              <div
                className="mx-auto mb-4 w-[180px] h-[180px] flex items-center justify-center bg-white rounded-lg p-2"
                dangerouslySetInnerHTML={{ __html: qrSvg }}
              />
            )}

            {/* Código alfanumérico como respaldo */}
            <p className="text-xs text-neutral-400 mb-1">O introduce manualmente:</p>
            <p className="text-lg font-bold tracking-widest text-neutral-950 dark:text-neutral-100 font-mono">
              {customer.discountCode}
            </p>
          </div>
        )}

        {/* ── Tarjeta: Sumar puntos con factura ───────── */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm p-6">
          <h2 className="text-sm font-semibold mb-1">Sumar puntos con una factura</h2>
          <p className="text-xs text-neutral-400 mb-3">
            Si has comprado en el negocio, introduce el número de tu factura para ganar 1 punto extra
          </p>

          {invoice && (
            <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium mb-3">
              ¡Has ganado 1 punto! 🎉
            </p>
          )}
          {invoiceError && (
            <p className="text-sm text-red-500 mb-3">{invoiceError}</p>
          )}

          <form
            action={async (formData: FormData) => {
              'use server';
              const number = formData.get('invoice') as string;
              if (!number) redirect(`/${slug}/customer/${customerId}?invoiceError=Número de factura requerido`);
              try {
                await claimInvoice(customerId, slug, number);
                redirect(`/${slug}/customer/${customerId}?invoice=1`);
              } catch (e) {
                const msg = e instanceof Error ? e.message : 'Error al canjear factura';
                redirect(`/${slug}/customer/${customerId}?invoiceError=${encodeURIComponent(msg)}`);
              }
            }}
            className="flex gap-2"
          >
            <input
              name="invoice"
              type="text"
              required
              placeholder="Nº de factura"
              className="flex-1 min-w-0 px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-md text-sm text-neutral-950 dark:text-neutral-100 bg-white dark:bg-neutral-800 outline-none transition-all duration-150 focus:border-neutral-950 dark:focus:border-neutral-400 focus:shadow-[0_0_0_2px_rgba(0,0,0,0.05)] placeholder:text-neutral-400"
            />
            <Button type="submit" variant="secondary">
              Canjear
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
