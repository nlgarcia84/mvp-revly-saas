'use client';

import { useState, useEffect } from 'react';
import { createBusiness, getBusinesses } from '@/actions/business';

interface Business {
  id: string;
  name: string;
  googleLink: string | null;
  _count: { customers: number };
}

export default function BusinessPage() {
  const [open, setOpen] = useState(false);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [form, setForm] = useState({ name: '', googleLink: '' });

  async function load() {
    setBusinesses(await getBusinesses());
  }

  useEffect(() => { load(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await createBusiness(form);
    setForm({ name: '', googleLink: '' });
    setOpen(false);
    await load();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold mb-1">Negocios</h1>
          <p className="text-sm text-neutral-500">Gestiona tus negocios y sus enlaces de reseña</p>
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
            className="bg-white border border-neutral-200 rounded-xl shadow-sm w-[420px] p-8"
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
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
