import { getBusinessBySlug, addPublicCustomer } from '@/actions/business';

const PublicBusinessPage = async ({
  params,
}: {
  params: Promise<{ slug: string }>;
}) => {
  const { slug } = await params;
  const business = await getBusinessBySlug(slug);

  if (!business) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-100">
        <p className="text-neutral-500">Negocio no encontrado</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-100 p-4">
      <div className="bg-white border border-neutral-200 rounded-xl shadow-sm w-full max-w-md p-8">
        <h1 className="text-xl font-semibold mb-1">{business.name}</h1>
        <p className="text-sm text-neutral-500 mb-6">
          Déjanos tus datos para recibir una solicitud de reseña
        </p>

        <form
          action={async (formData: FormData) => {
            'use server';
            await addPublicCustomer({
              slug,
              name: formData.get('name') as string,
              email: formData.get('email') as string,
              phone: (formData.get('phone') as string) || undefined,
            });
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
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 px-[18px] py-2.5 rounded-md text-sm font-medium border border-neutral-950 bg-neutral-950 text-white transition-all duration-150 hover:bg-neutral-800"
          >
            Enviar
          </button>
        </form>
      </div>
    </div>
  );
};

export default PublicBusinessPage;
