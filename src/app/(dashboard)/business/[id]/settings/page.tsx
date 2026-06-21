'use client';

import { useEffect, useState, use } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { getBusinesses, updateBusiness, uploadBusinessImage } from '@/actions/business';
import { validateGoogleUrl, type UrlValidationResult } from '@/actions/validate-url';
import { searchBusinessOnGoogle, type GooglePlaceResult } from '@/actions/search-business';
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
  const [urlValidation, setUrlValidation] = useState<UrlValidationResult | null>(null);
  const [validating, setValidating] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLocation, setSearchLocation] = useState('');
  const [searchResults, setSearchResults] = useState<GooglePlaceResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [urlFound, setUrlFound] = useState('');

  useEffect(() => {
    if (urlFound) {
      const t = setTimeout(() => setUrlFound(''), 3000);
      return () => clearTimeout(t);
    }
  }, [urlFound]);

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

  // ── Validación automática del enlace de Google ────
  // Cada vez que el usuario escribe en el campo "Enlace
  // de Google Reviews", esperamos 600ms (para no saturar
  // el servidor) y luego comprobamos si la URL es válida.
  // El resultado se muestra con un borde verde (✓) o
  // rojo (✗) y un mensaje explicativo.
  // ──────────────────────────────────────────────────
  useEffect(() => {
    if (!form.googleLink.trim()) {
      setUrlValidation(null);
      return;
    }
    const t = setTimeout(async () => {
      setValidating(true);
      const result = await validateGoogleUrl(form.googleLink);
      setUrlValidation(result);
      setValidating(false);
    }, 600);
    return () => clearTimeout(t);
  }, [form.googleLink]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const results = await searchBusinessOnGoogle(searchQuery, searchLocation);
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    }
    setSearching(false);
  };

  const handleSelectResult = (result: GooglePlaceResult) => {
    setForm({ ...form, googleLink: result.googleLink });
    setShowSearch(false);
    setSearchResults([]);
    setUrlFound(result.name);
  };

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
            <div className="relative">
              <input
                value={form.googleLink}
                onChange={(e) => setForm({ ...form, googleLink: e.target.value })}
                className={`w-full px-3 py-2.5 border rounded-md text-sm text-neutral-950 dark:text-neutral-100 bg-white dark:bg-neutral-800 outline-none transition-colors pr-9 ${
                  urlValidation?.valid
                    ? 'border-emerald-400 focus:border-emerald-500'
                    : urlValidation && urlValidation.valid === false
                    ? 'border-red-400 focus:border-red-500'
                    : 'border-neutral-200 dark:border-neutral-700 focus:border-neutral-950 dark:focus:border-neutral-400'
                }`}
                placeholder="https://search.google.com/local/writereview?placeid=..."
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sm leading-none">
                {validating ? (
                  <span className="text-neutral-300 animate-pulse">···</span>
                ) : urlValidation?.valid ? (
                  <span className="text-emerald-500">✓</span>
                ) : urlValidation && urlValidation.valid === false ? (
                  <span className="text-red-400" title={urlValidation.error}>✗</span>
                ) : null}
              </span>
            </div>
            {urlValidation && urlValidation.valid === false && (
              <p className="text-xs text-red-500 mt-1.5">{urlValidation.error}</p>
            )}
            {urlValidation?.valid && (
              <p className="text-xs text-emerald-600 mt-1.5">Enlace válido</p>
            )}
            {urlFound && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 mt-1.5">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                URL encontrada: {urlFound}
              </div>
            )}
            {/* Buscador automático de Google Places */}
            <div className="mt-3">
              {showSearch ? (
                <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-4 bg-neutral-50 dark:bg-neutral-800/50">
                  <p className="text-xs font-medium text-neutral-500 mb-3">
                    Busca tu negocio en Google por nombre
                  </p>
                  <div className="flex flex-col gap-2">
                    <input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Nombre del negocio"
                      className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-md text-sm bg-white dark:bg-neutral-800 outline-none focus:border-neutral-950 dark:focus:border-neutral-400"
                    />
                    <input
                      value={searchLocation}
                      onChange={(e) => setSearchLocation(e.target.value)}
                      placeholder="Ciudad o dirección (opcional)"
                      className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-md text-sm bg-white dark:bg-neutral-800 outline-none focus:border-neutral-950 dark:focus:border-neutral-400"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleSearch}
                        disabled={searching || !searchQuery.trim()}
                        className="text-xs font-medium px-4 py-2 rounded-md bg-neutral-950 dark:bg-neutral-100 text-white dark:text-neutral-950 hover:opacity-80 transition-opacity disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                      >
                        {searching && (
                          <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                        )}
                        {searching ? 'Buscando...' : 'Buscar'}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setShowSearch(false); setSearchResults([]); }}
                        className="text-xs font-medium px-4 py-2 rounded-md border border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:border-neutral-950 dark:hover:border-neutral-100 transition-colors cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                  {/* Resultados de la búsqueda */}
                  {searchResults.length > 0 && (
                    <div className="mt-3 flex flex-col gap-1.5 max-h-48 overflow-y-auto">
                      {searchResults.map((r) => (
                        <button
                          key={r.placeId}
                          type="button"
                          onClick={() => handleSelectResult(r)}
                          className="text-left w-full px-3 py-2 rounded-md border border-neutral-200 dark:border-neutral-700 hover:border-neutral-950 dark:hover:border-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                        >
                          <span className="text-sm font-medium block">{r.name}</span>
                          <span className="text-xs text-neutral-400">{r.address}</span>
                          {r.rating && (
                            <span className="text-xs text-amber-500 ml-2">
                              ★ {r.rating} ({r.userRatingsTotal})
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                  {searchResults.length === 0 && !searching && searchQuery.trim() && (
                    <p className="text-xs text-neutral-400 mt-3">No se encontraron resultados</p>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => { setShowSearch(true); setSearchQuery(form.name); }}
                  className="text-xs text-neutral-400 hover:text-neutral-950 dark:hover:text-neutral-100 underline transition-colors cursor-pointer"
                >
                  ¿No tienes el enlace? Busca tu negocio en Google
                </button>
              )}
            </div>
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
