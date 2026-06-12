'use client';

import { useState, useEffect } from 'react';
import { createBusiness, getBusinesses } from '@/actions/business';
import QRCode from 'qrcode';

interface Business {
  id: string;
  name: string;
  slug: string | null;
  googleLink: string | null;
  _count: { customers: number };
}

const BusinessQR = ({ slug }: { slug: string }) => {
  const [url, setUrl] = useState('');
  const [show, setShow] = useState(false);

  useEffect(() => {
    QRCode.toDataURL(`https://revly.es/${slug}`, {
      width: 180,
      margin: 1,
    }).then(setUrl);
  }, [slug]);

  return (
    <div className="relative">
      <button
        onClick={() => setShow(!show)}
        className="text-xs text-neutral-400 hover:text-neutral-950 underline transition-colors"
      >
        QR
      </button>
      {show && url && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShow(false)} />
          <div className="absolute right-0 top-6 z-50 bg-white border border-neutral-200 rounded-xl shadow-lg p-3">
            <img src={url} alt={`QR para ${slug}`} className="w-[180px] h-[180px]" />
            <p className="text-[10px] text-neutral-400 text-center mt-1">revly.es/{slug}</p>
          </div>
        </>
      )}
    </div>
  );
};

const BusinessPage = () => {
  const [open, setOpen] = useState(false);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [form, setForm] = useState({ name: '', googleLink: '' });

  const load = async () => {
    setBusinesses(await getBusinesses());
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createBusiness(form);
    setForm({ name: '', googleLink: '' });
    setOpen(false);
    await load();
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold mb-1">Negocios</h1>
          <p className="text-xs sm:text-sm text-neutral-500">Gestiona tus negocios y sus enlaces de reseña</p>
        </div>
        <button
          className="inline-flex items-center justify-center gap-2 px-[18px] py-2 rounded-md text-sm font-medium cursor-pointer border border-neutral-950 bg-neutral-950 text-white transition-all duration-150 hover:bg-neutral-800 hover:border-neutral-800"
          onClick={() => setOpen(true)}
        >
          + Nuevo negocio
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white border border-neutral-200 rounded-xl shadow-sm w-full max-w-[400px] sm:w-[420px] p-6 sm:p-8"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold mb-6">Crear negocio</h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-medium mb-[6px] text-neutral-500">
                  Nombre del negocio
                </label>
                <input
                  className="w-full px-3 py-2.5 border border-neutral-200 rounded-md text-sm text-neutral-950 bg-white outline-none transition-all duration-150 focus:border-neutral-950 focus:shadow-[0_0_0_2px_rgba(0,0,0,0.05)] placeholder:text-neutral-400"
                  placeholder="Ej: Cafetería El Centro"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-[6px] text-neutral-500">
                  Enlace de Google Reviews
                </label>
                <input
                  className="w-full px-3 py-2.5 border border-neutral-200 rounded-md text-sm text-neutral-950 bg-white outline-none transition-all duration-150 focus:border-neutral-950 focus:shadow-[0_0_0_2px_rgba(0,0,0,0.05)] placeholder:text-neutral-400"
                  placeholder="https://search.google.com/local/writereview?placeid=..."
                  value={form.googleLink}
                  onChange={e => setForm({ ...form, googleLink: e.target.value })}
                />
                <p className="text-[12px] text-neutral-400 mt-1">
                  Enlace para que los clientes dejen su reseña en Google
                </p>
              </div>
              <div className="flex gap-2 justify-end mt-2">
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-2 px-[18px] py-2 rounded-md text-sm font-medium cursor-pointer border border-neutral-200 bg-white text-neutral-950 transition-all duration-150 hover:bg-neutral-100 hover:border-neutral-300"
                  onClick={() => setOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 px-[18px] py-2 rounded-md text-sm font-medium cursor-pointer border border-neutral-950 bg-neutral-950 text-white transition-all duration-150 hover:bg-neutral-800 hover:border-neutral-800"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {businesses.length === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-sm">
          <p className="text-sm text-neutral-400 text-center py-12">
            Todavía no tienes negocios registrados
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {businesses.map((b) => (
            <div key={b.id} className="bg-white border border-neutral-200 rounded-xl shadow-sm flex items-center justify-between px-5 py-4">
              <div>
                <span className="font-medium">{b.name}</span>
                <span className="text-xs text-neutral-400 ml-3">
                  {b._count.customers} clientes
                </span>
                {b.slug && (
                  <a
                    href={`/${b.slug}`}
                    target="_blank"
                    className="block text-xs text-neutral-400 hover:text-neutral-950 underline mt-1"
                  >
                    revly.es/{b.slug}
                  </a>
                )}
              </div>
              <div className="flex items-center gap-3">
                <BusinessQR slug={b.slug ?? ''} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BusinessPage;
