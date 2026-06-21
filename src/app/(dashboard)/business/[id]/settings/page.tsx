'use client';

import { useEffect, useState, use } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { getBusinesses, updateBusiness, uploadBusinessImage } from '@/actions/business';
import Button from '@/components/ui/button';
import { nCard } from '@/components/ui/card';
import BackButton from '@/components/back-button';

type Business = Awaited<ReturnType<typeof getBusinesses>>[number];

const SettingsPage = ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = use(params);
  const router = useRouter();
  const [business, setBusiness] = useState<Business | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    name: '',
    googleLink: '',
    slug: '',
    emailTemplate: '',
  });

  useEffect(() => {
    getBusinesses().then((list) => {
      const b = list.find((x) => x.id === id);
      if (b) {
        setBusiness(b);
        setForm({
          name: b.name,
          googleLink: b.googleLink ?? '',
          slug: b.slug ?? '',
          emailTemplate: (b as any).emailTemplate ?? '',
        });
      }
    });
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    try {
      await updateBusiness(id, form);
      if (logoFile) {
        const fd = new FormData();
        fd.append('file', logoFile);
        await uploadBusinessImage(id, fd);
      }
      setLogoFile(null);
      setMsg('Guardado correctamente');
    } catch (err: any) {
      setMsg(err.message);
    }
    setSaving(false);
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <BackButton label="Volver a clientes" href={`/business/${id}`} />
        <h1 className="text-xl sm:text-2xl font-semibold mb-1">
          Configuración
        </h1>
        <p className="text-xs sm:text-sm text-neutral-500">{business?.name}</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className={`${nCard} p-6 flex flex-col gap-5`}>
          <h2 className="text-sm font-semibold">Información del negocio</h2>

          <div>
            <label className="block text-xs font-medium mb-[6px] text-neutral-500">
              Nombre
            </label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2.5 border border-neutral-200 dark:border-neutral-700 rounded-md text-sm text-neutral-950 dark:text-neutral-100 bg-white dark:bg-neutral-800 outline-none focus:border-neutral-950 dark:focus:border-neutral-400"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-[6px] text-neutral-500">
              Enlace de Google Reviews
            </label>
            <input
              value={form.googleLink}
              onChange={(e) => setForm({ ...form, googleLink: e.target.value })}
              className="w-full px-3 py-2.5 border border-neutral-200 dark:border-neutral-700 rounded-md text-sm text-neutral-950 dark:text-neutral-100 bg-white dark:bg-neutral-800 outline-none focus:border-neutral-950 dark:focus:border-neutral-400"
              placeholder="https://search.google.com/local/writereview?placeid=..."
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-[6px] text-neutral-500">
              Slug (URL pública)
            </label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-neutral-400">revly.es/</span>
              <input
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                className="flex-1 px-3 py-2.5 border border-neutral-200 dark:border-neutral-700 rounded-md text-sm text-neutral-950 dark:text-neutral-100 bg-white dark:bg-neutral-800 outline-none focus:border-neutral-950 dark:focus:border-neutral-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-[6px] text-neutral-500">
              Logo del negocio
            </label>
            {business?.image && !logoFile && (
              <div className="w-16 h-16 rounded-lg overflow-hidden mb-3">
                <Image src={business.image} alt={business.name} width={64} height={64} className="object-cover w-full h-full" />
              </div>
            )}
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
        </div>

        <div className={`${nCard} p-6 flex flex-col gap-5`}>
          <div>
            <h2 className="text-sm font-semibold mb-1">Plantilla del email</h2>
            <p className="text-xs text-neutral-400">
              Puedes usar las variables: {'{'}nombre{'}'}, {'{'}negocio{'}'},{' '}
              {'{'}link{'}'}, {'{'}confirmar{'}'}. Si está vacío se usa el
              mensaje por defecto.
            </p>
          </div>
          <textarea
            value={form.emailTemplate}
            onChange={(e) =>
              setForm({ ...form, emailTemplate: e.target.value })
            }
            rows={6}
            className="w-full px-3 py-2.5 border border-neutral-200 dark:border-neutral-700 rounded-md text-sm text-neutral-950 dark:text-neutral-100 bg-white dark:bg-neutral-800 outline-none focus:border-neutral-950 dark:focus:border-neutral-400 resize-y font-mono"
            placeholder={`<h1>Hola, {{nombre}}</h1>\n<p>Gracias por visitar {{negocio}}...</p>`}
          />
        </div>

        {msg && (
          <p
            className={`text-sm ${msg === 'Guardado correctamente' ? 'text-emerald-500' : 'text-red-500'}`}
          >
            {msg}
          </p>
        )}

        <div className="flex gap-2 justify-center">
          <Button type="submit" disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default SettingsPage;
