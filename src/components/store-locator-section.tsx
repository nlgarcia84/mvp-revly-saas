"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import Button from "@/components/ui/button";
import {
  deleteBusinessPhoto,
  fetchGoogleStoreData,
  geocodeAddress,
  updateStoreInfo,
  uploadBusinessPhoto,
} from "@/actions/store-locator";
import {
  DAY_LABELS,
  DEFAULT_OPENING_HOURS,
  MAX_PHOTOS,
  MAX_SLOTS_PER_DAY,
  parseOpeningHoursOrDefault,
  type OpeningHours,
  type StorePhoto,
} from "@/lib/store-hours";

// ──────────────────────────────────────────────
// StoreLocatorSection
// ──────────────────────────────────────────────
// Permite al negocio gestionar la información de su local:
// dirección (con mapa), fotos y horarios de apertura.
// Todo lo que se rellene aquí se muestra en la página
// pública /{slug}.
// ──────────────────────────────────────────────

type StoreLocatorSectionProps = {
  businessId: string;
  initial: {
    address?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    openingHours?: unknown;
    photos?: unknown;
  };
  onSaved?: () => void;
};

const inputClass =
  "w-full px-3 py-2.5 border border-neutral-200 dark:border-neutral-700 rounded-md text-sm text-neutral-950 dark:text-neutral-100 bg-white dark:bg-neutral-800 outline-none focus:border-neutral-950 dark:focus:border-neutral-400 focus:shadow-[0_0_0_2px_rgba(0,0,0,0.05)]";

const labelClass = "block text-xs font-medium mb-[6px] text-neutral-500";

const buttonSecondary =
  "inline-flex items-center gap-1.5 text-xs font-medium px-4 py-2 rounded-md border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:border-neutral-950 dark:hover:border-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";

const parsePhotos = (value: unknown): StorePhoto[] =>
  Array.isArray(value)
    ? value.filter(
        (photo): photo is StorePhoto =>
          !!photo &&
          typeof photo === "object" &&
          typeof (photo as StorePhoto).url === "string" &&
          typeof (photo as StorePhoto).path === "string",
      )
    : [];

// Enlace al mapa de Google sin necesidad de API key.
const buildMapUrl = (
  address: string,
  latitude: number | null,
  longitude: number | null,
) => {
  if (latitude !== null && longitude !== null) {
    return `https://www.google.com/maps?q=${latitude},${longitude}&output=embed`;
  }
  if (address) {
    return `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`;
  }
  return null;
};

const buildDirectionsUrl = (
  address: string,
  latitude: number | null,
  longitude: number | null,
) => {
  if (latitude !== null && longitude !== null) {
    return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
  }
  if (address) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
  }
  return null;
};

const StoreLocatorSection = ({
  businessId,
  initial,
  onSaved,
}: StoreLocatorSectionProps) => {
  const [address, setAddress] = useState(initial.address ?? "");
  const [latitude, setLatitude] = useState<number | null>(
    initial.latitude ?? null,
  );
  const [longitude, setLongitude] = useState<number | null>(
    initial.longitude ?? null,
  );
  const [hours, setHours] = useState<OpeningHours>(() =>
    parseOpeningHoursOrDefault(initial.openingHours ?? DEFAULT_OPENING_HOURS),
  );
  const [photos, setPhotos] = useState<StorePhoto[]>(() =>
    parsePhotos(initial.photos),
  );

  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingPath, setDeletingPath] = useState<string | null>(null);

  // ─── Importación desde Google ──────────────────
  const importFromGoogle = async () => {
    setImporting(true);
    setError("");
    setMsg("");
    const result = await fetchGoogleStoreData(businessId);
    if (result.success) {
      if (result.address) setAddress(result.address);
      if (result.latitude !== undefined && result.latitude !== null) {
        setLatitude(result.latitude);
      }
      if (result.longitude !== undefined && result.longitude !== null) {
        setLongitude(result.longitude);
      }
      if (result.openingHours) setHours(result.openingHours);
      setMsg("Datos importados desde Google. Revisa y pulsa Guardar.");
    } else {
      setError(result.error);
    }
    setImporting(false);
  };

  // Importa automáticamente al cargar la sección.
  useEffect(() => {
    importFromGoogle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  const mapUrl = buildMapUrl(address.trim(), latitude, longitude);
  const directionsUrl = buildDirectionsUrl(
    address.trim(),
    latitude,
    longitude,
  );

  // ─── Dirección ──────────────────────────────
  const handleSearchAddress = async () => {
    if (!address.trim()) {
      setError("Escribe la dirección del local");
      return;
    }
    setLocating(true);
    setError("");
    const result = await geocodeAddress(address.trim());
    if (result.success) {
      setAddress(result.address);
      setLatitude(result.latitude);
      setLongitude(result.longitude);
      setMsg("Ubicación encontrada. Pulsa Guardar para conservarla.");
    } else {
      setError(result.error);
    }
    setLocating(false);
  };

  const handleUseMyLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("Tu navegador no permite obtener la ubicación");
      return;
    }
    setLocating(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude);
        setLongitude(position.coords.longitude);
        setMsg("Ubicación detectada. Pulsa Guardar para conservarla.");
        setLocating(false);
      },
      () => {
        setError("No se pudo obtener tu ubicación");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  // ─── Horarios ───────────────────────────────
  const updateDay = (day: number, patch: Partial<OpeningHours["days"][number]>) => {
    setHours((prev) => ({
      ...prev,
      days: prev.days.map((item) =>
        item.day === day ? { ...item, ...patch } : item,
      ),
    }));
  };

  const handleToggleDay = (day: number) => {
    const current = hours.days.find((item) => item.day === day);
    if (!current) return;

    if (current.closed) {
      updateDay(day, {
        closed: false,
        slots:
          current.slots.length > 0
            ? current.slots
            : [{ open: "09:00", close: "14:00" }],
      });
    } else {
      updateDay(day, { closed: true, slots: [] });
    }
  };

  const handleSlotChange = (
    day: number,
    index: number,
    field: "open" | "close",
    value: string,
  ) => {
    const current = hours.days.find((item) => item.day === day);
    if (!current) return;

    const slots = current.slots.map((slot, slotIndex) =>
      slotIndex === index ? { ...slot, [field]: value } : slot,
    );
    updateDay(day, { slots });
  };

  const handleAddSlot = (day: number) => {
    const current = hours.days.find((item) => item.day === day);
    if (!current) return;
    updateDay(day, {
      slots: [...current.slots, { open: "17:00", close: "20:00" }],
    });
  };

  const handleRemoveSlot = (day: number, index: number) => {
    const current = hours.days.find((item) => item.day === day);
    if (!current) return;
    updateDay(day, {
      slots: current.slots.filter((_, slotIndex) => slotIndex !== index),
    });
  };

  const handleApplyToWeek = () => {
    // Copia el lunes al resto de días de la semana (lunes a sábado).
    const monday = hours.days.find((item) => item.day === 0);
    if (!monday) return;

    setHours((prev) => ({
      ...prev,
      days: prev.days.map((item) =>
        item.day >= 0 && item.day <= 5
          ? {
              day: item.day,
              closed: monday.closed,
              slots: monday.slots.map((slot) => ({ ...slot })),
            }
          : item,
      ),
    }));
  };

  // ─── Fotos ──────────────────────────────────
  const handleUpload = async (file: File) => {
    setError("");
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    const result = await uploadBusinessPhoto(businessId, formData);
    if (result.success) {
      setPhotos(result.photos);
    } else {
      setError(result.error);
    }
    setUploading(false);
  };

  const handleDeletePhoto = async (path: string) => {
    setError("");
    setDeletingPath(path);
    const result = await deleteBusinessPhoto(businessId, path);
    if (result.success) {
      setPhotos(result.photos);
    } else {
      setError(result.error);
    }
    setDeletingPath(null);
  };

  // ─── Guardar ────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    setMsg("");
    setError("");

    const result = await updateStoreInfo(businessId, {
      address,
      latitude,
      longitude,
      openingHours: hours,
    });

    if (result.success) {
      setMsg("Guardado correctamente");
      onSaved?.();
    } else {
      setError(result.error);
    }
    setSaving(false);
  };

  return (
    <div className="flex flex-col gap-8">
      {/* ── Dirección y mapa ───────────────────── */}
      <div>
        <h3 className="text-sm font-semibold mb-1">Dirección y ubicación</h3>
        <p className="text-xs text-neutral-400 mb-3">
          Se muestra en tu página pública para que tus clientes te encuentren.
        </p>

        <div className="flex flex-col gap-2">
          <label className={labelClass} htmlFor="store-address">
            Dirección del local
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              id="store-address"
              type="text"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              placeholder="Carrer de Mallorca 1, Barcelona"
              className={inputClass}
            />
            <Button
              variant="secondary"
              type="button"
              onClick={handleSearchAddress}
              disabled={locating}
            >
              {locating ? "Buscando..." : "Buscar en Google"}
            </Button>
            <Button
              variant="secondary"
              type="button"
              onClick={handleUseMyLocation}
              disabled={locating}
            >
              Mi ubicación
            </Button>
            <Button
              variant="secondary"
              type="button"
              onClick={importFromGoogle}
              disabled={importing}
            >
              {importing ? "Importando..." : "Importar desde Google"}
            </Button>
          </div>
          <p className="text-xs text-neutral-400">
            También puedes pegar un enlace de Google Maps: se leerán las
            coordenadas automáticamente.
          </p>
        </div>

        {latitude !== null && longitude !== null && (
          <p className="mt-2 text-xs text-neutral-400">
            Coordenadas: {latitude.toFixed(5)}, {longitude.toFixed(5)}
          </p>
        )}

        {mapUrl && (
          <div className="mt-4 flex flex-col gap-2">
            <div className="w-full h-56 rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-800">
              <iframe
                src={mapUrl}
                title="Mapa del local"
                className="w-full h-full"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
            {directionsUrl && (
              <a
                href={directionsUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-neutral-100 underline underline-offset-2 self-start"
              >
                Ver cómo llegar
              </a>
            )}
          </div>
        )}
      </div>

      {/* ── Fotos ──────────────────────────────── */}
      <div>
        <h3 className="text-sm font-semibold mb-1">Fotos del local</h3>
        <p className="text-xs text-neutral-400 mb-3">
          Hasta {MAX_PHOTOS} fotos (PNG, JPEG o WebP, máximo 5MB cada una).
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {photos.map((photo) => (
            <div
              key={photo.path}
              className="relative w-full h-28 rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-800"
            >
              <Image
                src={photo.url}
                alt="Foto del local"
                fill
                sizes="(max-width: 640px) 50vw, 200px"
                className="object-cover"
              />
              <button
                type="button"
                onClick={() => handleDeletePhoto(photo.path)}
                disabled={deletingPath === photo.path}
                aria-label="Eliminar foto"
                className="absolute top-1.5 right-1.5 w-7 h-7 rounded-md bg-black/60 text-white text-xs font-medium flex items-center justify-center hover:bg-black/80 transition-colors disabled:opacity-50 cursor-pointer"
              >
                ×
              </button>
            </div>
          ))}

          {photos.length < MAX_PHOTOS && (
            <label className="w-full h-28 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 flex flex-col items-center justify-center gap-1 text-xs text-neutral-400 hover:border-neutral-950 dark:hover:border-neutral-400 transition-colors cursor-pointer">
              <span className="text-lg leading-none">+</span>
              {uploading ? "Subiendo..." : "Añadir foto"}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                disabled={uploading}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) handleUpload(file);
                  event.target.value = "";
                }}
              />
            </label>
          )}
        </div>

        <p className="mt-2 text-xs text-neutral-400">
          {photos.length}/{MAX_PHOTOS} fotos
        </p>
      </div>

      {/* ── Horarios ───────────────────────────── */}
      <div>
        <h3 className="text-sm font-semibold mb-1">Horarios de apertura</h3>
        <p className="text-xs text-neutral-400 mb-3">
          Indica hasta {MAX_SLOTS_PER_DAY} franjas por día.
        </p>

        <div className="flex flex-col gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={hours.mode === "always"}
              onChange={(event) =>
                setHours((prev) => ({
                  ...prev,
                  mode: event.target.checked ? "always" : "hours",
                }))
              }
              className="w-4 h-4 border border-neutral-300 dark:border-neutral-600 rounded-sm accent-neutral-950 dark:accent-neutral-100"
            />
            <span className="text-xs text-neutral-600 dark:text-neutral-300">
              Abierto todo el día (24 horas)
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={hours.mode === "variable"}
              onChange={(event) =>
                setHours((prev) => ({
                  ...prev,
                  mode: event.target.checked ? "variable" : "hours",
                }))
              }
              className="w-4 h-4 border border-neutral-300 dark:border-neutral-600 rounded-sm accent-neutral-950 dark:accent-neutral-100"
            />
            <span className="text-xs text-neutral-600 dark:text-neutral-300">
              Horario variable (consultar por teléfono)
            </span>
          </label>

          {hours.mode === "hours" && (
            <>
              <div className="flex flex-col gap-2">
                {hours.days.map((day) => (
                  <div
                    key={day.day}
                    className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 pb-2 border-b border-neutral-100 dark:border-neutral-800 last:border-0"
                  >
                    <label className="flex items-center gap-2 sm:w-40 cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={!day.closed}
                        onChange={() => handleToggleDay(day.day)}
                        className="w-4 h-4 border border-neutral-300 dark:border-neutral-600 rounded-sm accent-neutral-950 dark:accent-neutral-100"
                      />
                      <span className="text-xs font-medium text-neutral-700 dark:text-neutral-200">
                        {DAY_LABELS[day.day]}
                      </span>
                    </label>

                    {day.closed ? (
                      <span className="text-xs text-neutral-400">Cerrado</span>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {day.slots.map((slot, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-2 flex-wrap"
                          >
                            <input
                              type="time"
                              value={slot.open}
                              onChange={(event) =>
                                handleSlotChange(
                                  day.day,
                                  index,
                                  "open",
                                  event.target.value,
                                )
                              }
                              className="px-2.5 py-1.5 border border-neutral-200 dark:border-neutral-700 rounded-md text-xs text-neutral-950 dark:text-neutral-100 bg-white dark:bg-neutral-800 outline-none focus:border-neutral-950 dark:focus:border-neutral-400"
                            />
                            <span className="text-xs text-neutral-400">–</span>
                            <input
                              type="time"
                              value={slot.close}
                              onChange={(event) =>
                                handleSlotChange(
                                  day.day,
                                  index,
                                  "close",
                                  event.target.value,
                                )
                              }
                              className="px-2.5 py-1.5 border border-neutral-200 dark:border-neutral-700 rounded-md text-xs text-neutral-950 dark:text-neutral-100 bg-white dark:bg-neutral-800 outline-none focus:border-neutral-950 dark:focus:border-neutral-400"
                            />
                            {day.slots.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveSlot(day.day, index)}
                                aria-label={`Quitar franja de ${DAY_LABELS[day.day]}`}
                                className="text-xs text-neutral-400 hover:text-red-500 transition-colors cursor-pointer"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        ))}

                        {day.slots.length < MAX_SLOTS_PER_DAY && (
                          <button
                            type="button"
                            onClick={() => handleAddSlot(day.day)}
                            className="text-xs font-medium text-neutral-500 hover:text-neutral-950 dark:hover:text-neutral-200 transition-colors cursor-pointer self-start"
                          >
                            + Añadir franja
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handleApplyToWeek}
                className={buttonSecondary}
              >
                Aplicar el lunes de lunes a sábado
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Guardar ────────────────────────────── */}
      <div className="flex flex-col gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-800">
        {msg && <p className="text-xs text-emerald-600">{msg}</p>}
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div>
          <Button
            variant="primary"
            type="button"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default StoreLocatorSection;