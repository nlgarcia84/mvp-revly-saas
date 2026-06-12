import { getBusinessBySlug, addPublicCustomer } from '@/actions/business';
import { redirect } from 'next/navigation';

// ──────────────────────────────────────────────
// PublicBusinessPage (Server Component)
// ──────────────────────────────────────────────
// Página pública visitada por los clientes del negocio
// (revly.es/{slug}). Muestra un formulario para canjear
// un 10% de descuento a cambio de datos de contacto.
//
// Flujo:
//   1. Sin ?success → muestra formulario con nombre,
//      email, teléfono y checkbox de privacidad.
//   2. Al enviar → Server Action addPublicCustomer con
//      consent validado. Si ok, redirect a ?success=1.
//   3. Con ?success → pantalla de agradecimiento.
//      El cliente presenta este mensaje para el descuento.
// ──────────────────────────────────────────────
const PublicBusinessPage = async ({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ success?: string }>;
}) => {
  const { slug } = await params;
  const { success } = await searchParams;
  const business = await getBusinessBySlug(slug);

  if (!business) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-100">
        <p className="text-neutral-500">Negocio no encontrado</p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-100 p-4">
        <div className="bg-white border border-neutral-200 rounded-xl shadow-sm w-full max-w-md p-8 text-center">
          <h1 className="text-xl font-semibold mb-1">¡Gracias, {business.name}!</h1>
          <p className="text-sm text-neutral-500 mb-6">
            Tus datos han sido registrados correctamente.
            Presenta este mensaje en tu próxima compra para obtener tu <strong>10% de descuento</strong>.
          </p>
          <a
            href={`/${slug}`}
            className="inline-flex items-center justify-center gap-2 px-[18px] py-2.5 rounded-md text-sm font-medium border border-neutral-950 bg-neutral-950 text-white transition-all duration-150 hover:bg-neutral-800"
          >
            Volver
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-100 p-4">
      <div className="bg-white border border-neutral-200 rounded-xl shadow-sm w-full max-w-md p-8">
        <h1 className="text-xl font-semibold mb-1">{business.name}</h1>
        <p className="text-xs text-neutral-400 mb-4">
          Déjanos tus datos y obtén un <strong>10% de descuento</strong> en tu próxima compra
        </p>

        <form
          action={async (formData: FormData) => {
            'use server';
            await addPublicCustomer({
              slug,
              name: formData.get('name') as string,
              email: formData.get('email') as string,
              phone: (formData.get('phone') as string) || undefined,
              consent: formData.get('consent') === 'on',
            });
            redirect(`/${slug}?success=1`);
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
              className="w-full px-3 py-2.5 border border-neutral-200 rounded-md text-sm text-neutral-950 bg-white outline-none transition-all duration-150 focus:border-neutral-950 focus:shadow-[0_0_0_2px_rgba(0,0,0,0.05)] placeholder:text-neutral-400"
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
              className="w-full px-3 py-2.5 border border-neutral-200 rounded-md text-sm text-neutral-950 bg-white outline-none transition-all duration-150 focus:border-neutral-950 focus:shadow-[0_0_0_2px_rgba(0,0,0,0.05)] placeholder:text-neutral-400"
              placeholder="tu@email.com"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-[6px] text-neutral-500">
              Teléfono <span className="text-neutral-300">(opcional)</span>
            </label>
            <input
              name="phone"
              type="tel"
              className="w-full px-3 py-2.5 border border-neutral-200 rounded-md text-sm text-neutral-950 bg-white outline-none transition-all duration-150 focus:border-neutral-950 focus:shadow-[0_0_0_2px_rgba(0,0,0,0.05)] placeholder:text-neutral-400"
              placeholder="+34 600 000 000"
            />
          </div>

          <label className="flex items-start gap-2 cursor-pointer">
            <input
              name="consent"
              type="checkbox"
              required
              className="mt-0.5 w-4 h-4 border border-neutral-300 rounded-sm accent-neutral-950"
            />
            <span className="text-xs text-neutral-400 leading-relaxed">
              He leído y acepto la{' '}
              <a href="/privacidad" target="_blank" className="underline hover:text-neutral-950">
                política de privacidad
              </a>{' '}
              y cedo mis datos para recibir comunicaciones comerciales de {business.name}
            </span>
          </label>

          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 px-[18px] py-2.5 rounded-md text-sm font-medium border border-neutral-950 bg-neutral-950 text-white transition-all duration-150 hover:bg-neutral-800"
          >
            Obtener 10% de descuento
          </button>
        </form>
      </div>
    </div>
  );
};

export default PublicBusinessPage;
