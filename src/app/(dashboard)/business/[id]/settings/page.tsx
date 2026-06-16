'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { getBusinesses, updateBusiness } from '@/actions/business';
import Button from '@/components/ui/button';
import { nCard } from '@/components/ui/card';

type Business = Awaited<ReturnType<typeof getBusinesses>>[number];

const SettingsPage = ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = use(params);
  const router = useRouter();
  const [business, setBusiness] = useState<Business | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState({ name: '', googleLink: '', slug: '', emailTemplate: '' });

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
      setMsg('Guardado correctamente');
    } catch (err: any) {
      setMsg(err.message);
    }
    setSaving(false);
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <button
          onClick={() => router.push(`/business/${id}`)}
          className="text-xs text-neutral-400 hover:text-neutral-950 dark:hover:text-neutral-100 transition-colors mb-1"
        >
          &larr; Volver a clientes
        </button>
        <h1 className="text-xl sm:text-2xl font-semibold mb-1">Configuración</h1>
        <p className="text-xs sm:text-sm text-neutral-500">{business?.name}</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className={`${nCard} p-6 flex flex-col gap-5`}>
          <h2 className="text-sm font-semibold">Información del negocio</h2>

          <div>
            <label className="block text-xs font-medium mb-[6px] text-neutral-500">Nombre</label>
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
            <label className="block text-xs font-medium mb-[6px] text-neutral-500">Slug (URL pública)</label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-neutral-400">revly.es/</span>
              <input
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                className="flex-1 px-3 py-2.5 border border-neutral-200 dark:border-neutral-700 rounded-md text-sm text-neutral-950 dark:text-neutral-100 bg-white dark:bg-neutral-800 outline-none focus:border-neutral-950 dark:focus:border-neutral-400"
              />
            </div>
          </div>
        </div>

        <div className={`${nCard} p-6 flex flex-col gap-5`}>
          <div>
            <h2 className="text-sm font-semibold mb-1">Plantilla del email</h2>
            <p className="text-xs text-neutral-400">
            Puedes usar las variables: {'{'}nombre{'}'}, {'{'}negocio{'}'}, {'{'}link{'}'}, {'{'}confirmar{'}'}. Si está vacío se usa el mensaje por defecto.
            </p>
          </div>
          <textarea
            value={form.emailTemplate}
            onChange={(e) => setForm({ ...form, emailTemplate: e.target.value })}
            rows={6}
            className="w-full px-3 py-2.5 border border-neutral-200 dark:border-neutral-700 rounded-md text-sm text-neutral-950 dark:text-neutral-100 bg-white dark:bg-neutral-800 outline-none focus:border-neutral-950 dark:focus:border-neutral-400 resize-y font-mono"
            placeholder={`<h1>Hola, {{nombre}}</h1>\n<p>Gracias por visitar {{negocio}}...</p>`}
          />
        </div>

        {msg && (
          <p className={`text-sm ${msg === 'Guardado correctamente' ? 'text-emerald-500' : 'text-red-500'}`}>{msg}</p>
        )}

        <div className="flex gap-2">
          <Button type="submit" disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default SettingsPage;
