import {
  DAY_SHORT_LABELS,
  isCurrentlyOpen,
  jsDayToWeekDay,
  parseOpeningHours,
  type StorePhoto,
} from "@/lib/store-hours";

// ──────────────────────────────────────────────
// PublicStoreInfo
// ──────────────────────────────────────────────
// Bloque "Dónde encontrarnos" de la página pública
// /{slug}. Es un Server Component (no necesita JS):
//   - fotos del local (primera = portada)
//   - dirección + mapa de Google (iframe embed)
//   - horarios de apertura con "Abierto ahora"
// Solo se renderiza si el negocio ha rellenado algo.
// ──────────────────────────────────────────────

type PublicStoreInfoProps = {
  businessName: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  openingHours?: unknown;
  photos?: unknown;
};

const parsePhotos = (value: unknown): StorePhoto[] =>
  Array.isArray(value)
    ? value.filter(
        (photo): photo is StorePhoto =>
          !!photo &&
          typeof photo === "object" &&
          typeof (photo as StorePhoto).url === "string",
      )
    : [];

export default function PublicStoreInfo({
  businessName,
  address,
  latitude,
  longitude,
  openingHours,
  photos,
}: PublicStoreInfoProps) {
  const photoList = parsePhotos(photos);
  const hours = parseOpeningHours(openingHours);
  const cleanAddress = (address ?? "").trim();

  const mapUrl =
    latitude !== null && latitude !== undefined &&
    longitude !== null && longitude !== undefined
      ? `https://www.google.com/maps?q=${latitude},${longitude}&output=embed`
      : cleanAddress
        ? `https://www.google.com/maps?q=${encodeURIComponent(cleanAddress)}&output=embed`
        : null;

  const directionsUrl =
    latitude !== null && latitude !== undefined &&
    longitude !== null && longitude !== undefined
      ? `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`
      : cleanAddress
        ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(cleanAddress)}`
        : null;

  // Sin nada publicable no pintamos el bloque.
  if (!cleanAddress && photoList.length === 0 && !hours) return null;

  const openNow = hours ? isCurrentlyOpen(hours) : false;

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm w-full max-w-md p-8 mt-4">
      <h2 className="text-sm font-semibold mb-4">Dónde encontrarnos</h2>

      {/* ── Portada + galería ───────────────────── */}
      {photoList.length > 0 && (
        <div className="flex flex-col gap-2 mb-4">
          <div className="w-full h-48 rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoList[0].url}
              alt={`${businessName} — foto del local`}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
          {photoList.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {photoList.slice(1, 5).map((photo, index) => (
                <div
                  key={photo.url}
                  className="w-full h-16 rounded-lg overflow-hidden bg-neutral-100 dark:bg-neutral-800"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.url}
                    alt={`${businessName} — foto ${index + 2} del local`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Dirección + mapa ────────────────────── */}
      {cleanAddress && (
        <div className="flex flex-col gap-2 mb-4">
          <p className="text-sm text-neutral-800 dark:text-neutral-200">
            {cleanAddress}
          </p>
          {directionsUrl && (
            <a
              href={directionsUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-medium text-neutral-950 dark:text-neutral-100 underline underline-offset-2 w-fit"
            >
              Cómo llegar
            </a>
          )}
        </div>
      )}

      {mapUrl && (
        <div className="w-full h-44 rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-800 mb-4">
          <iframe
            src={mapUrl}
            title={`Mapa de ${businessName}`}
            className="w-full h-full"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      )}

      {/* ── Horarios ────────────────────────────── */}
      {hours && (
        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <h3 className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Horario
            </h3>
            {hours.mode === "always" ? (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                Abierto 24 horas
              </span>
            ) : hours.mode === "variable" ? (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                Horario variable
              </span>
            ) : (
              <span
                className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                  openNow
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
                }`}
              >
                {openNow ? "Abierto ahora" : "Cerrado ahora"}
              </span>
            )}
          </div>

          {hours.mode === "hours" && (
            <ul className="flex flex-col gap-1">
              {hours.days.map((day) => {
                const isToday =
                  day.day === jsDayToWeekDay(new Date().getDay());
                return (
                  <li
                    key={day.day}
                    className={`flex items-center justify-between gap-2 text-xs ${
                      isToday
                        ? "font-semibold text-neutral-950 dark:text-neutral-100"
                        : "text-neutral-500 dark:text-neutral-400"
                    }`}
                  >
                    <span>{DAY_SHORT_LABELS[day.day]}</span>
                    <span className="text-right">
                      {day.closed
                        ? "Cerrado"
                        : day.slots
                            .map((slot) => `${slot.open} – ${slot.close}`)
                            .join(" · ")}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}