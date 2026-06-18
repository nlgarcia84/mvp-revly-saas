'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { createBusiness, getBusinesses, uploadBusinessImage } from '@/actions/business';
import QRCode from 'qrcode';
import Button from '@/components/ui/button';
import { nCard } from '@/components/ui/card';

type Business = Awaited<ReturnType<typeof getBusinesses>>[number];

// ──────────────────────────────────────────────
// BusinessQR
// ──────────────────────────────────────────────
// Componente que genera un código QR para la URL
// pública del negocio (revly.es/{slug}). Al hacer
// clic en "QR" se muestra/oculta con un overlay
// semitransparente de fondo.
// ──────────────────────────────────────────────
const BusinessQR = ({ slug }: { slug: string }) => {
  const [url, setUrl] = useState('');
  const [show, setShow] = useState(false);

  useEffect(() => {
    QRCode.toDataURL(`https://revly.es/${slug}`, {
      width: 176,
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
          <div className="absolute right-0 top-6 z-50 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-lg p-3">
            <img
              src={url}
              alt={`QR para ${slug}`}
              className="w-44 h-44 object-contain"
            />
            <p className="text-[10px] text-neutral-400 text-center mt-1">
              revly.es/{slug}
            </p>
          </div>
        </>
      )}
    </div>
  );
};

const BusinessPage = () => {
  // ── Modal de creación ──
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [form, setForm] = useState({ name: '', googleLink: '' });
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const load = useCallback(async () => {
    setBusinesses(await getBusinesses());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Al enviar el formulario: crea el negocio en BD,
  // resetea el formulario, cierra el modal y recarga
  // la lista para mostrar el nuevo slug y QR.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const business = await createBusiness(form);
      if (logoFile) {
        const fd = new FormData();
        fd.append('file', logoFile);
        await uploadBusinessImage(business.id, fd);
      }
      setForm({ name: '', googleLink: '' });
      setLogoFile(null);
      setOpen(false);
      await load();
    } catch (err: any) {
      alert(err.message);
    }
    setCreating(false);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold mb-1">Negocios</h1>
          <p className="text-xs sm:text-sm text-neutral-500">
            Gestiona tus negocios y sus enlaces de reseña
          </p>
        </div>
        <Button variant="primary" onClick={() => setOpen(true)}>
          + Nuevo negocio
        </Button>
      </div>

      {open && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm w-full max-w-[400px] sm:w-[420px] p-6 sm:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold mb-6">Crear negocio</h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold mb-[6px] text-neutral-500 dark:text-neutral-400">
                  Nombre del negocio
                </label>
                <input
                  className="w-full px-3 py-2.5 border border-neutral-200 dark:border-neutral-700 rounded-md text-sm text-neutral-950 dark:text-neutral-100 bg-white dark:bg-neutral-800 outline-none transition-all duration-150 focus:border-neutral-950 dark:focus:border-neutral-400 focus:shadow-[0_0_0_2px_rgba(0,0,0,0.05)] placeholder:text-neutral-400"
                  placeholder="Ej: Cafetería El Centro"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-[6px] text-neutral-500 dark:text-neutral-400">
                  Enlace de Google Reviews
                </label>
                <input
                  className="w-full px-3 py-2.5 border border-neutral-200 dark:border-neutral-700 rounded-md text-sm text-neutral-950 dark:text-neutral-100 bg-white dark:bg-neutral-800 outline-none transition-all duration-150 focus:border-neutral-950 dark:focus:border-neutral-400 focus:shadow-[0_0_0_2px_rgba(0,0,0,0.05)] placeholder:text-neutral-400"
                  placeholder="https://search.google.com/local/writereview?placeid=..."
                  value={form.googleLink}
                  onChange={(e) =>
                    setForm({ ...form, googleLink: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-[6px] text-neutral-500 dark:text-neutral-400">
                  Logo del negocio
                </label>
                <label className="flex items-center gap-2 px-3 py-2.5 border border-neutral-200 dark:border-neutral-700 rounded-md text-sm text-neutral-400 bg-white dark:bg-neutral-800 cursor-pointer hover:border-neutral-400 dark:hover:border-neutral-500 transition-colors">
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)} />
                  <svg
                    className="w-4 h-4 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <span>{logoFile ? logoFile.name : 'Seleccionar archivo'}</span>
                </label>
              </div>

              <div className="flex gap-2 justify-end mt-2">
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => setOpen(false)}
                >
                  Cancelar
                </Button>
                <Button variant="primary" type="submit" disabled={creating}>
                  {creating ? 'Guardando...' : 'Guardar'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {businesses.length === 0 ? (
        <div className={`${nCard} p-6`}>
          <p className="text-sm text-neutral-400 text-center py-12">
            Todavía no tienes negocios registrados
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {businesses.map((b) => (
            <Link
              href={`/business/${b.id}`}
              className="font-medium hover:text-neutral-950 dark:hover:text-neutral-100 transition-colors"
            >
              <div>
                <div
                  key={b.id}
                  className={`${nCard} flex items-center justify-between px-5 py-4`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {b.image && (
                      <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0">
                        <Image
                          src={b.image}
                          alt={b.name}
                          width={40}
                          height={40}
                          className="object-cover w-full h-full"
                        />
                      </div>
                    )}
                    <div className="min-w-0">
                      <span className="font-medium truncate block">
                        {b.name}
                      </span>
                      {b.slug && (
                        <a
                          href={`/${b.slug}`}
                          target="_blank"
                          className="text-xs text-neutral-400 hover:text-neutral-950 dark:hover:text-neutral-100 underline truncate block"
                        >
                          revly.es/{b.slug}
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Link
                      href={`/business/${b.id}/settings`}
                      className="text-xs text-neutral-400 hover:text-neutral-950 dark:hover:text-neutral-100 underline transition-colors"
                    >
                      Configurar
                    </Link>
                    <BusinessQR slug={b.slug ?? ''} />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default BusinessPage;
