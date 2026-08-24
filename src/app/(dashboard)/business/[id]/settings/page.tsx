"use client";

import {
  deleteBusiness,
  getBusinesses,
  updateBusiness,
  uploadBusinessImage,
} from "@/actions/business";
import { getBusinessProfileStatus } from "@/actions/google-reviews";
import { getFacebookConnectionStatus } from "@/actions/facebook";
import { getInstagramConnectionStatus } from "@/actions/instagram";
import { updateVerificationPin } from "@/actions/redeem";
import {
  searchBusinessOnGoogle,
  type GooglePlaceResult,
} from "@/actions/search-business";
import {
  validateGoogleUrl,
  type UrlValidationResult,
} from "@/actions/validate-url";
import BackButton from "@/components/back-button";
import Button from "@/components/ui/button";
import { nCard } from "@/components/ui/card";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";

type Business = Awaited<ReturnType<typeof getBusinesses>>[number];

const SettingsPage = ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = use(params);
  const router = useRouter();
  const [business, setBusiness] = useState<Business | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [msg, setMsg] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    name: "",
    googleLink: "",
    slug: "",
    emailTemplate: "",
    invoiceFormat: "",
  });
  const [urlValidation, setUrlValidation] =
    useState<UrlValidationResult | null>(null);
  const [validating, setValidating] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLocation, setSearchLocation] = useState("");
  const [searchPostalCode, setSearchPostalCode] = useState("");
  const [searchResults, setSearchResults] = useState<GooglePlaceResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [urlFound, setUrlFound] = useState("");
  const [bpStatus, setBpStatus] = useState<{ connected: boolean } | null>(null);
  const [igStatus, setIgStatus] = useState<{
    connected: boolean;
    username?: string | null;
    expiresAt?: Date | string | null;
    expired?: boolean;
  } | null>(null);
  const [fbStatus, setFbStatus] = useState<{
    connected: boolean;
    pageName?: string | null;
    expiresAt?: Date | string | null;
    expired?: boolean;
  } | null>(null);
  const [pin, setPin] = useState("");
  const [savingPin, setSavingPin] = useState(false);
  const [pinMsg, setPinMsg] = useState("");

  // ── Mensajes desde el callback de Google Business Profile ──
  // Cuando el usuario conecta o desconecta su cuenta de Google
  // Business Profile, Google nos redirige de vuelta a Settings
  // con un mensaje de éxito o error en la URL.
  // ──────────────────────────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get("bp_success");
    const error = params.get("bp_error");
    const igSuccess = params.get("ig_success");
    const igError = params.get("ig_error");
    const fbSuccess = params.get("fb_success");
    const fbError = params.get("fb_error");
    if (success) {
      setMsg(success);
      // Limpiamos la URL para que no se vea el parámetro
      window.history.replaceState({}, "", window.location.pathname);
    } else if (error) {
      setMsg(error);
      window.history.replaceState({}, "", window.location.pathname);
    } else if (igSuccess) {
      setMsg(igSuccess);
      window.history.replaceState({}, "", window.location.pathname);
    } else if (igError) {
      setMsg(igError);
      window.history.replaceState({}, "", window.location.pathname);
    } else if (fbSuccess) {
      setMsg(fbSuccess);
      window.history.replaceState({}, "", window.location.pathname);
    } else if (fbError) {
      setMsg(fbError);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // ── Comprueba si el negocio tiene Google Business Profile ──
  // Al cargar la página, preguntamos al servidor si este
  // negocio tiene tokens de Business Profile guardados.
  // ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (id) {
      getBusinessProfileStatus(id)
        .then(setBpStatus)
        .catch(() => setBpStatus(null));
    }
  }, [id]);

  // ── Comprueba si el negocio tiene Instagram conectado ──
  useEffect(() => {
    if (id) {
      getInstagramConnectionStatus(id)
        .then(setIgStatus)
        .catch(() => setIgStatus(null));
    }
  }, [id]);

  // ── Comprueba si el negocio tiene Facebook conectado ──
  useEffect(() => {
    if (id) {
      getFacebookConnectionStatus(id)
        .then(setFbStatus)
        .catch(() => setFbStatus(null));
    }
  }, [id]);

  useEffect(() => {
    if (urlFound) {
      const t = setTimeout(() => setUrlFound(""), 3000);
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
          googleLink: b.googleLink ?? "",
          slug: b.slug ?? "",
          emailTemplate: (b as any).emailTemplate ?? "",
          invoiceFormat: (b as any).invoiceFormat ?? "",
        });
        setPin((b as any).verificationPin ?? "");
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
      const results = await searchBusinessOnGoogle(
        searchQuery,
        searchLocation,
        searchPostalCode,
      );
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

  const handleDelete = async () => {
    if (
      !window.confirm(
        "¿Eliminar este negocio? Todos sus clientes se borrarán permanentemente.",
      )
    )
      return;
    setDeleting(true);
    try {
      await deleteBusiness(id);
      router.push("/business");
    } catch (err: any) {
      setMsg(err.message);
      setDeleting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    try {
      await updateBusiness(id, form);
      if (logoFile) {
        const fd = new FormData();
        fd.append("file", logoFile);
        await uploadBusinessImage(id, fd);
      }
      setLogoFile(null);
      setMsg("Guardado correctamente");
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
            <label className="block text-xs font-medium mb-1.5 text-neutral-500">
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
            <label className="block text-xs font-medium mb-1.5 text-neutral-500">
              Enlace de Google Reviews
            </label>
            <div className="relative">
              <input
                value={form.googleLink}
                onChange={(e) =>
                  setForm({ ...form, googleLink: e.target.value })
                }
                className={`w-full px-3 py-2.5 border rounded-md text-sm text-neutral-950 dark:text-neutral-100 bg-white dark:bg-neutral-800 outline-none transition-colors pr-9 ${
                  urlValidation?.valid
                    ? "border-emerald-400 focus:border-emerald-500"
                    : urlValidation && urlValidation.valid === false
                      ? "border-red-400 focus:border-red-500"
                      : "border-neutral-200 dark:border-neutral-700 focus:border-neutral-950 dark:focus:border-neutral-400"
                }`}
                placeholder="https://search.google.com/local/writereview?placeid=..."
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sm leading-none">
                {validating ? (
                  <span className="text-neutral-300 animate-pulse">···</span>
                ) : urlValidation?.valid ? (
                  <span className="text-emerald-500">✓</span>
                ) : urlValidation && urlValidation.valid === false ? (
                  <span className="text-red-400" title={urlValidation.error}>
                    ✗
                  </span>
                ) : null}
              </span>
            </div>
            {urlValidation && urlValidation.valid === false && (
              <p className="text-xs text-red-500 mt-1.5">
                {urlValidation.error}
              </p>
            )}
            {urlValidation?.valid && (
              <p className="text-xs text-emerald-600 mt-1.5">Enlace válido</p>
            )}
            {urlFound && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 mt-1.5">
                <svg
                  className="w-3.5 h-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
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
                          <svg
                            className="w-3.5 h-3.5 animate-spin"
                            viewBox="0 0 24 24"
                            fill="none"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                            />
                          </svg>
                        )}
                        {searching ? "Buscando..." : "Buscar"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowSearch(false);
                          setSearchResults([]);
                        }}
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
                          <span className="text-sm font-medium block">
                            {r.name}
                          </span>
                          <span className="text-xs text-neutral-400">
                            {r.address}
                          </span>
                          {r.rating && (
                            <span className="text-xs text-amber-500 ml-2">
                              ★ {r.rating} ({r.userRatingsTotal})
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                  {searchResults.length === 0 &&
                    !searching &&
                    searchQuery.trim() && (
                      <p className="text-xs text-neutral-400 mt-3">
                        No se encontraron resultados
                      </p>
                    )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setShowSearch(true);
                    setSearchQuery(form.name);
                  }}
                  className="text-xs text-neutral-400 hover:text-neutral-950 dark:hover:text-neutral-100 underline transition-colors cursor-pointer"
                >
                  ¿No tienes el enlace? Busca tu negocio en Google
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5 text-neutral-500">
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
            <label className="block text-xs font-medium mb-1.5 text-neutral-500">
              Logo del negocio
            </label>
            {business?.image && !logoFile && (
              <div className="w-16 h-16 rounded-lg overflow-hidden mb-3">
                <Image
                  src={business.image}
                  alt={business.name}
                  width={64}
                  height={64}
                  className="object-cover w-full h-full"
                />
              </div>
            )}
            <label className="flex items-center gap-2 px-3 py-2.5 border border-neutral-200 dark:border-neutral-700 rounded-md text-sm text-neutral-400 bg-white dark:bg-neutral-800 cursor-pointer hover:border-neutral-400 dark:hover:border-neutral-500 transition-colors">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
              />
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
              <span>{logoFile ? logoFile.name : "Seleccionar archivo"}</span>
            </label>
            <p className="text-xs text-neutral-400 mt-1">
              Máximo 1 MB · Resolución recomendada: 512x512 px
            </p>
          </div>
        </div>

        <div className={`${nCard} p-6 flex flex-col gap-5`}>
          <div>
            <h2 className="text-sm font-semibold mb-1">Plantilla del email</h2>
            <p className="text-xs text-neutral-400">
              Puedes usar las variables: {"{"}nombre{"}"}, {"{"}negocio{"}"},{" "}
              {"{"}link{"}"}, {"{"}confirmar{"}"}. Si está vacío se usa el
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

        {/* ── Formato de facturas ───────────────────────── */}
        <div className={`${nCard} p-6 flex flex-col gap-5`}>
          <h2 className="text-sm font-semibold">Formato de facturas</h2>
          <p className="text-xs text-neutral-400 leading-relaxed">
            Los clientes escribirán el número de factura para sumar puntos. Pon
            un ejemplo para que sepan el formato exacto.
          </p>
          <input
            value={form.invoiceFormat}
            onChange={(e) =>
              setForm({ ...form, invoiceFormat: e.target.value })
            }
            placeholder="Ej: FACT-001 o INV-2024-001"
            className="w-full px-3 py-2.5 border border-neutral-200 dark:border-neutral-700 rounded-md text-sm text-neutral-950 dark:text-neutral-100 bg-white dark:bg-neutral-800 outline-none focus:border-neutral-950 dark:focus:border-neutral-400"
          />
          {form.invoiceFormat && (
            <p className="text-xs text-neutral-400">
              En el perfil del cliente aparecerá:{" "}
              <span className="font-mono">{form.invoiceFormat}</span>
            </p>
          )}
        </div>

        {/* ── Canje en caja ────────────────────────────── */}
        <div className={`${nCard} p-6 flex flex-col gap-5`}>
          <div>
            <h2 className="text-sm font-semibold mb-1">Canje en caja</h2>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Los empleados escanean el QR del cliente desde su móvil y escriben
              este PIN para verificar y canjear el descuento en caja.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5 text-neutral-500">
              PIN de verificación (4 dígitos)
            </label>
            <div className="flex gap-2 items-start">
              <input
                value={pin}
                onChange={(e) =>
                  setPin(e.target.value.replace(/\D/g, "").slice(0, 4))
                }
                type="text"
                inputMode="numeric"
                pattern="[0-9]{4}"
                maxLength={4}
                placeholder="1234"
                className="w-24 px-3 py-2.5 text-center text-lg tracking-[0.3em] border border-neutral-200 dark:border-neutral-700 rounded-md text-neutral-950 dark:text-neutral-100 bg-white dark:bg-neutral-800 outline-none focus:border-neutral-950 dark:focus:border-neutral-400 placeholder:text-neutral-300 dark:placeholder:text-neutral-600"
              />
              <button
                type="button"
                onClick={async () => {
                  setSavingPin(true);
                  setPinMsg("");
                  try {
                    const result = await updateVerificationPin(id, pin);
                    setPinMsg("PIN guardado correctamente");
                  } catch (e: any) {
                    setPinMsg(e.message);
                  }
                  setSavingPin(false);
                }}
                disabled={savingPin || pin.length !== 4}
                className="text-xs font-medium px-4 py-2.5 rounded-md bg-neutral-950 dark:bg-neutral-100 text-white dark:text-neutral-950 hover:opacity-80 transition-opacity disabled:opacity-50 cursor-pointer"
              >
                {savingPin ? "Guardando..." : "Guardar PIN"}
              </button>
            </div>
            {pinMsg && (
              <p
                className={`text-xs mt-1.5 ${pinMsg === "PIN guardado correctamente" ? "text-emerald-500" : "text-red-500"}`}
              >
                {pinMsg}
              </p>
            )}
          </div>

          {pin && (
            <div className="bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-lg p-3">
              <p className="text-xs text-neutral-500 mb-1">
                URL para los empleados:
              </p>
              <p className="text-xs font-mono text-neutral-950 dark:text-neutral-100 break-all">
                {typeof window !== "undefined"
                  ? `${window.location.origin}/${form.slug || "..."}/verificar/`
                  : `/${form.slug || "..."}/verificar/`}
                <span className="text-neutral-400">[código del cliente]</span>
              </p>
              <p className="text-xs text-neutral-400 mt-1">
                El empleado escanea el QR del cliente con la cámara y escribe
                este PIN de 4 dígitos.
              </p>
            </div>
          )}
        </div>

        {msg && (
          <p
            className={`text-sm ${msg === "Guardado correctamente" || msg.includes("correctamente") ? "text-emerald-500" : "text-red-500"}`}
          >
            {msg}
          </p>
        )}

        <div className="flex flex-col gap-3">
          <div className="flex gap-2 justify-center">
            <Button type="submit" disabled={saving}>
              {saving ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>
          <div className="flex gap-2 justify-center pt-2 border-t border-neutral-200 dark:border-neutral-700">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="text-xs text-red-400 hover:text-red-500 disabled:opacity-50 cursor-pointer"
            >
              {deleting ? "Eliminando..." : "Eliminar negocio"}
            </button>
          </div>
        </div>
      </form>

      {/* ── Conexión con Google Business Profile ──────── */}
      {/* Aquí el usuario puede conectar su cuenta de Google
          Business Profile para ver TODAS las reseñas de su
          negocio (en lugar de solo 5). Necesita tener el
          perfil verificado en Google. */}
      <div className={`${nCard} p-6 flex flex-col gap-5`}>
        <div>
          <h2 className="text-sm font-semibold mb-1">
            Google Business Profile
          </h2>
          <p className="text-xs text-neutral-400 leading-relaxed">
            Conecta tu cuenta de Google Business Profile para ver todas las
            reseñas de tu negocio (sin límite de 5). Necesitas tener el perfil
            verificado en Google.
          </p>
          <p className="text-xs text-neutral-500 mt-2 leading-relaxed">
            Si Google bloquea Business Profile en tu región, la app seguirá
            funcionando con Google Places API y mostrará solo las últimas 5
            reseñas.
          </p>
        </div>

        {bpStatus === null ? (
          <p className="text-xs text-neutral-400">Comprobando conexión...</p>
        ) : bpStatus.connected ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 rounded-md border border-emerald-200 dark:border-emerald-800">
              <svg
                className="w-4 h-4 shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Conectado a Google Business Profile
            </div>
            <a
              href={`/api/google-business/disconnect?businessId=${id}`}
              className="text-xs text-red-400 hover:text-red-500 underline transition-colors w-fit cursor-pointer"
            >
              Desconectar
            </a>
            <p className="text-xs text-neutral-400">
              Las reseñas se cargarán desde Business Profile API (todas
              disponibles). Si hay algún problema, se usará automáticamente
              Google Places API (5 reseñas) como respaldo.
            </p>
          </div>
        ) : (
          <Button
            as="a"
            href={`/api/google-business/connect?businessId=${id}`}
            variant="primary"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Conectar con Google
          </Button>
        )}
      </div>

      {/* ── Conexión con Instagram ────────────────────── */}
      {/* Aquí el usuario conecta su cuenta profesional de
          Instagram (Business/Creator vinculada a una página
          de Facebook) para leer y responder los comentarios
          desde el dashboard con ayuda de la IA. */}
      <div className={`${nCard} p-6 flex flex-col gap-5`}>
        <div>
          <h2 className="text-sm font-semibold mb-1">Instagram</h2>
          <p className="text-xs text-neutral-400 leading-relaxed">
            Conecta tu cuenta profesional (Business o Creator) de Instagram
            para ver los comentarios de tus publicaciones y responderlos con
            IA.
          </p>
          <p className="text-xs text-neutral-500 mt-2 leading-relaxed">
            El acceso vía Meta dura 60 días. Cuando caduque, solo tendrás que
            reconectar pulsando el botón una vez más.
          </p>
        </div>

        {igStatus === null ? (
          <p className="text-xs text-neutral-400">Comprobando conexión...</p>
        ) : igStatus.connected ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 rounded-md border border-emerald-200 dark:border-emerald-800">
              <svg
                className="w-4 h-4 shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {igStatus.expired
                ? "Conectado pero el acceso de Meta ha caducado — vuelve a conectar"
                : `Conectado a Instagram${igStatus.username ? ` (@${igStatus.username})` : ""}`}
            </div>
            {!igStatus.expired && igStatus.expiresAt && (
              <p className="text-xs text-neutral-400">
                El acceso expira el{" "}
                {new Date(igStatus.expiresAt as string).toLocaleDateString(
                  "es-ES",
                )}
                . Vuelve a conectar antes de esa fecha para no perderlo.
              </p>
            )}
            <a
              href={`/api/instagram/disconnect?businessId=${id}`}
              className="text-xs text-red-400 hover:text-red-500 underline transition-colors w-fit cursor-pointer"
            >
              Desconectar
            </a>
            <p className="text-xs text-neutral-400">
              Cuando conectes, los comentarios de tus últimas publicaciones se
              mostrarán en la página del negocio y podrás responderlos con IA.
            </p>
          </div>
        ) : (
          <Button
            as="a"
            href={`/api/instagram/connect?businessId=${id}`}
            variant="primary"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
              <rect
                x="2"
                y="2"
                width="20"
                height="20"
                rx="5"
                stroke="currentColor"
                strokeWidth="2"
              />
              <circle
                cx="12"
                cy="12"
                r="4.5"
                stroke="currentColor"
                strokeWidth="2"
              />
              <circle cx="17.5" cy="6.5" r="1.3" fill="currentColor" />
            </svg>
            Conectar con Instagram
          </Button>
        )}
      </div>

      {/* ── Conexión con Facebook ────────────────────── */}
      {/* Aquí el usuario conecta su Página de Facebook
          para leer y responder comentarios desde el
          dashboard y publicar contenido en la página. */}
      <div className={`${nCard} p-6 flex flex-col gap-5`}>
        <div>
          <h2 className="text-sm font-semibold mb-1">Facebook</h2>
          <p className="text-xs text-neutral-400 leading-relaxed">
            Conecta tu Página de Facebook para ver los comentarios de tus
            publicaciones, responderlos con IA y publicar contenido
            directamente desde Revly.
          </p>
          <p className="text-xs text-neutral-500 mt-2 leading-relaxed">
            Necesitas administrar una Página de Facebook con tu cuenta. El
            acceso de usuario dura 60 días; cuando caduque, solo tendrás que
            reconectar pulsando el botón una vez más.
          </p>
        </div>

        {fbStatus === null ? (
          <p className="text-xs text-neutral-400">Comprobando conexión...</p>
        ) : fbStatus.connected ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 rounded-md border border-emerald-200 dark:border-emerald-800">
              <svg
                className="w-4 h-4 shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {fbStatus.expired
                ? "Conectado pero el acceso de Facebook ha caducado — vuelve a conectar"
                : `Conectado a Facebook${fbStatus.pageName ? ` (${fbStatus.pageName})` : ""}`}
            </div>
            {!fbStatus.expired && fbStatus.expiresAt && (
              <p className="text-xs text-neutral-400">
                El acceso expira el{" "}
                {new Date(fbStatus.expiresAt as string).toLocaleDateString(
                  "es-ES",
                )}
                . Vuelve a conectar antes de esa fecha para no perderlo.
              </p>
            )}
            <a
              href={`/api/facebook/disconnect?businessId=${id}`}
              className="text-xs text-red-400 hover:text-red-500 underline transition-colors w-fit cursor-pointer"
            >
              Desconectar
            </a>
            <p className="text-xs text-neutral-400">
              Los comentarios de tus publicaciones se mostrarán en la página
              del negocio y podrás responderlos con IA y publicar contenido.
            </p>
          </div>
        ) : (
          <Button
            as="a"
            href={`/api/facebook/connect?businessId=${id}`}
            variant="primary"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
              <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047v-2.66c0-3.021 1.792-4.688 4.532-4.688 1.313 0 2.686.235 2.686.235v2.971H15.83c-1.491 0-1.956.93-1.956 1.886v2.256h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
            </svg>
            Conectar con Facebook
          </Button>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;
