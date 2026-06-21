'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { createBusiness, getBusinesses, uploadBusinessImage } from '@/actions/business';
import { searchBusinessOnGoogle, type GooglePlaceResult } from '@/actions/search-business';
import Button from '@/components/ui/button';
import { nCard } from '@/components/ui/card';
import BackButton from '@/components/back-button';
import BusinessQR from '@/components/business-qr';

type Business = Awaited<ReturnType<typeof getBusinesses>>[number];

const BusinessPage = () => {
  // ── Modal de creación ──
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [form, setForm] = useState({ name: '', googleLink: '' });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLocation, setSearchLocation] = useState('');
  const [searchPostalCode, setSearchPostalCode] = useState('');
  const [searchResults, setSearchResults] = useState<GooglePlaceResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [urlFound, setUrlFound] = useState('');

  useEffect(() => {
    if (urlFound) {
      const t = setTimeout(() => setUrlFound(''), 3000);
      return () => clearTimeout(t);
    }
  }, [urlFound]);

  const load = useCallback(async () => {
    setBusinesses(await getBusinesses());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const results = await searchBusinessOnGoogle(searchQuery, searchLocation, searchPostalCode);
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
          <BackButton href="/dashboard" />
          <h1 className="text-xl sm:text-2xl font-semibold mt-1 mb-1">Negocios</h1>
          <p className="text-xs sm:text-sm text-neutral-500">
            Gestiona tus negocios y sus enlaces de reseña
          </p>
        </div>
        <Button variant="primary" onClick={() => { setOpen(true); setShowSearch(false); setSearchResults([]); }}>
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
                {urlFound && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs text-emerald-600 transition-opacity duration-300">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    URL encontrada: {urlFound}
                  </div>
                )}
                <div className="mt-2">
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
                        <input
                          value={searchPostalCode}
                          onChange={(e) => setSearchPostalCode(e.target.value)}
                          placeholder="Código postal (opcional)"
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
                  <Link
                    href={`/business/${b.id}`}
                    className="font-medium truncate block hover:text-neutral-950 dark:hover:text-neutral-100 transition-colors"
                  >
                    {b.name}
                  </Link>
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
          ))}
        </div>
      )}
    </div>
  );
};

export default BusinessPage;
