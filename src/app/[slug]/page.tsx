import { getBusinessBySlug, addPublicCustomer } from '@/actions/business';
import { redirect } from 'next/navigation';
import Button from '@/components/ui/button';

// ──────────────────────────────────────────────
// PublicBusinessPage (Server Component)
// ──────────────────────────────────────────────
// Página pública visitada por los clientes del negocio
// (revly.es/{slug}). Muestra un formulario para unirse
// al programa de puntos y obtener descuentos.
//
// Flujo:
//   1. Sin ?success → muestra formulario con nombre,
//      email, teléfono y checkbox de privacidad.
//   2. Al enviar → Server Action addPublicCustomer.
//      Si el email ya existe, suma 1 punto más.
//      Si es nuevo, crea con 1 punto + código descuento.
//   3. Con ?success → pantalla de bienvenida con puntos
//      y enlace a la página del cliente.
//   4. Con ?error → muestra el mensaje de error.
// ──────────────────────────────────────────────
const PublicBusinessPage = async ({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ success?: string; error?: string; customerId?: string; points?: string }>;
}) => {
  const { slug } = await params;
  const { success, error, customerId, points } = await searchParams;
  const business = await getBusinessBySlug(slug);

  if (!business) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-100 dark:bg-neutral-950">
        <p className="text-neutral-500">Negocio no encontrado</p>
      </div>
    );
  }

  // ── Pantalla de éxito ─────────────────────────
  // El cliente se ha registrado correctamente.
  // Le mostramos sus puntos y un enlace a su perfil.
  if (success) {
    const puntos = points ? parseInt(points) : 1;
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-100 dark:bg-neutral-950 p-4">
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm w-full max-w-md p-8 text-center">
          <h1 className="text-xl font-semibold mb-1">¡Bienvenido, {business.name}!</h1>
          <p className="text-sm text-neutral-500 mb-6">
            Tus datos han sido registrados correctamente.
            Tienes <strong>{puntos} punto{puntos !== 1 ? 's' : ''}</strong> acumulado
            {puntos !== 1 ? 's' : ''}.
            Cada 5 puntos consigues un <strong>10% de descuento</strong>.
          </p>
          {customerId && (
            <Button as="a" variant="primary" href={`/${slug}/customer/${customerId}`}>
              Ver mi perfil y código de descuento
            </Button>
          )}
        </div>
      </div>
    );
  }

  // ── Pantalla de error ─────────────────────────
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-100 dark:bg-neutral-950 p-4">
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm w-full max-w-md p-8">
          <h1 className="text-xl font-semibold mb-4">Algo salió mal</h1>
          <p className="text-sm text-red-500 mb-6">{error}</p>
          <Button as="a" variant="primary" href={`/${slug}`}>
            Volver a intentar
          </Button>
        </div>
      </div>
    );
  }

  // ── Formulario ────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-100 dark:bg-neutral-950 p-4">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm w-full max-w-md p-8">
        <h1 className="text-xl font-semibold mb-1">{business.name}</h1>
        <p className="text-xs text-neutral-400 mb-4">
          Déjanos tus datos y empieza a <strong>acumular puntos</strong>.
          Cada 5 puntos consigues un <strong>10% de descuento</strong> en tus compras.
        </p>

        <form
          action={async (formData: FormData) => {
            'use server';
            try {
              const customer = await addPublicCustomer({
                slug,
                name: formData.get('name') as string,
                email: formData.get('email') as string,
                phone: (formData.get('phone') as string) || '',
                consent: formData.get('consent') === 'on',
              });
              redirect(
                `/${slug}?success=1&customerId=${customer.id}&points=${customer.points}`,
              );
            } catch (e) {
              if (e instanceof Error && 'digest' in e && typeof e.digest === 'string' && e.digest.startsWith('NEXT_REDIRECT')) {
                throw e;
              }
              const msg = e instanceof Error ? e.message : 'Error al procesar el formulario';
              redirect(`/${slug}?error=${encodeURIComponent(msg)}`);
            }
          }}
          className="flex flex-col gap-4"
        >
          <div>
            <label className="block text-xs font-medium mb-[6px] text-neutral-500">
              Nombre
            </label>
            <input
              name="name"
              type="text"
              required
              className="w-full px-3 py-2.5 border border-neutral-200 dark:border-neutral-700 rounded-md text-sm text-neutral-950 dark:text-neutral-100 bg-white dark:bg-neutral-800 outline-none transition-all duration-150 focus:border-neutral-950 dark:focus:border-neutral-400 focus:shadow-[0_0_0_2px_rgba(0,0,0,0.05)] placeholder:text-neutral-400"
              placeholder="Tu nombre"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-[6px] text-neutral-500">
              Correo electrónico
            </label>
            <input
              name="email"
              type="email"
              required
              className="w-full px-3 py-2.5 border border-neutral-200 dark:border-neutral-700 rounded-md text-sm text-neutral-950 dark:text-neutral-100 bg-white dark:bg-neutral-800 outline-none transition-all duration-150 focus:border-neutral-950 dark:focus:border-neutral-400 focus:shadow-[0_0_0_2px_rgba(0,0,0,0.05)] placeholder:text-neutral-400"
              placeholder="tu@email.com"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-[6px] text-neutral-500">
              Teléfono <span className="text-neutral-300 dark:text-neutral-600">(opcional)</span>
            </label>
            <input
              name="phone"
              type="tel"
              className="w-full px-3 py-2.5 border border-neutral-200 dark:border-neutral-700 rounded-md text-sm text-neutral-950 dark:text-neutral-100 bg-white dark:bg-neutral-800 outline-none transition-all duration-150 focus:border-neutral-950 dark:focus:border-neutral-400 focus:shadow-[0_0_0_2px_rgba(0,0,0,0.05)] placeholder:text-neutral-400"
              placeholder="+34 600 000 000"
            />
          </div>

          <label className="flex items-start gap-2 cursor-pointer">
            <input
              name="consent"
              type="checkbox"
              required
              className="mt-0.5 w-4 h-4 border border-neutral-300 dark:border-neutral-600 rounded-sm accent-neutral-950 dark:accent-neutral-100"
            />
            <span className="text-xs text-neutral-400 leading-relaxed">
              He leído y acepto la{' '}
              <a href="/privacidad" target="_blank" className="underline hover:text-neutral-950 dark:hover:text-neutral-100">
                política de privacidad
              </a>{' '}
              y cedo mis datos para recibir comunicaciones comerciales de {business.name}
            </span>
          </label>

          <Button type="submit">
            ¡Quiero empezar!
          </Button>
        </form>
      </div>
    </div>
  );
};

export default PublicBusinessPage;
