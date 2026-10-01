// ──────────────────────────────────────────────
// Store Locator: tipos y utilidades de horarios.
// ──────────────────────────────────────────────
// Los horarios se guardan como JSON en Business.openingHours
// para no crear una tabla aparte (un negocio solo tiene
// un local). Este módulo concentra los tipos, la
// validación (usada en servidor) y el formateo (usado
// en la página pública).
//
// Estructura guardada:
// {
//   mode: "hours" | "variable" | "always",
//   days: [{ day: 0, closed: boolean, slots: [{ open, close }] }]
// }
//   day: 0 = lunes … 6 = domingo (NO es getDay() de JS, que empieza en
//   domingo; para traducir usa jsDayToWeekDay).
// ──────────────────────────────────────────────

export type OpeningHoursMode = "hours" | "variable" | "always";

export type TimeSlot = {
  open: string;
  close: string;
};

export type DayHours = {
  day: number;
  closed: boolean;
  slots: TimeSlot[];
};

export type OpeningHours = {
  mode: OpeningHoursMode;
  days: DayHours[];
};

export const DAY_LABELS = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

export const DAY_SHORT_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export const WEEK_DAYS = [0, 1, 2, 3, 4, 5, 6];

export const MAX_SLOTS_PER_DAY = 2;
export const MAX_PHOTOS = 8;

// getDay() de JavaScript empieza en domingo (0 = domingo), pero nuestro
// horario se guarda empezando en lunes (0 = lunes). Esta función traduce
// un getDay() al índice de nuestro semana.
export const jsDayToWeekDay = (jsDay: number): number => (jsDay + 6) % 7;

export type StorePhoto = {
  url: string;
  path: string;
};

// Horarios por defecto: todo cerrado salvo lunes a viernes
// de 09:00 a 14:00 y de 17:00 a 20:00.
export const DEFAULT_OPENING_HOURS: OpeningHours = {
  mode: "hours",
  days: WEEK_DAYS.map((day) => ({
    day,
    closed: day >= 5,
    slots:
      day >= 5
        ? []
        : [
            { open: "09:00", close: "14:00" },
            { open: "17:00", close: "20:00" },
          ],
  })),
};

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const isValidTime = (value: unknown): value is string =>
  typeof value === "string" && TIME_PATTERN.test(value);

// Convierte "HH:MM" en minutos desde medianoche.
const timeToMinutes = (value: string): number => {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
};

// Normaliza un valor desconocido (BD o formulario) al tipo
// OpeningHours. Devuelve null si no hay nada utilizable.
export function parseOpeningHours(value: unknown): OpeningHours | null {
  if (!value || typeof value !== "object") return null;

  const raw = value as Partial<OpeningHours>;

  const mode: OpeningHoursMode =
    raw.mode === "variable" || raw.mode === "always" ? raw.mode : "hours";

  const days: DayHours[] = WEEK_DAYS.map((day) => {
    const rawDay = Array.isArray(raw.days)
      ? raw.days.find((d) => d && d.day === day)
      : undefined;

    const closed = rawDay?.closed ?? true;
    const slots = normalizeSlots(rawDay?.slots);

    // Un día marcado como abierto pero sin franjas válidas se trata
    // como cerrado: así lo que sale de aquí siempre pasa la validación.
    const isClosed = slots.length === 0 ? true : closed;

    return { day, closed: isClosed, slots };
  });

  return { mode, days };
}

// Descarta franjas inválidas, solapadas o duplicadas, y corta al máximo
// permitido. Así los datos guardados siempre son utilizables aunque el JSON
// de la BD estuviera manipulado.
function normalizeSlots(value: unknown): TimeSlot[] {
  if (!Array.isArray(value)) return [];

  const valid = value.filter(
    (slot): slot is TimeSlot =>
      !!slot &&
      typeof slot === "object" &&
      isValidTime(slot.open) &&
      isValidTime(slot.close),
  );

  const result: TimeSlot[] = [];
  let previousClose = -1;

  for (const slot of valid) {
    if (result.length >= MAX_SLOTS_PER_DAY) break;

    const open = timeToMinutes(slot.open);
    const close = timeToMinutes(slot.close);

    // Una franja que termina antes de empezar está bien (cierre al día
    // siguiente); el resto debe empezar después de la anterior.
    const overnight = close <= open;
    if (!overnight && open < previousClose) continue;

    result.push({ open: slot.open, close: slot.close });
    if (!overnight) previousClose = close;
  }

  return result;
}

// Convierte el valor de Prisma (Json) en OpeningHours, con el
// horario por defecto si el negocio todavía no lo ha definido.
export function parseOpeningHoursOrDefault(value: unknown): OpeningHours {
  return parseOpeningHours(value) ?? DEFAULT_OPENING_HOURS;
}

// Valida el horario enviado por el formulario. Devuelve un
// array de errores (vacío si todo correcto).
export function validateOpeningHours(value: OpeningHours): string[] {
  const errors: string[] = [];

  if (!value || typeof value !== "object") {
    return ["El horario no tiene un formato válido"];
  }

  if (!["hours", "variable", "always"].includes(value.mode)) {
    errors.push("El tipo de horario no es válido");
  }

  if (!Array.isArray(value.days) || value.days.length !== WEEK_DAYS.length) {
    errors.push("El horario debe incluir los 7 días de la semana");
    return errors;
  }

  for (const day of value.days) {
    if (!WEEK_DAYS.includes(day.day)) {
      errors.push("Hay un día de la semana no válido");
      continue;
    }

    if (day.closed) continue;

    if (!Array.isArray(day.slots) || day.slots.length === 0) {
      errors.push(`${DAY_LABELS[day.day]}: marca el día como cerrado o indica un horario`);
      continue;
    }

    if (day.slots.length > MAX_SLOTS_PER_DAY) {
      errors.push(`${DAY_LABELS[day.day]}: máximo ${MAX_SLOTS_PER_DAY} franjas por día`);
    }

    let previousClose = -1;
    for (const slot of day.slots) {
      if (!isValidTime(slot.open) || !isValidTime(slot.close)) {
        errors.push(`${DAY_LABELS[day.day]}: usa el formato HH:MM (ej. 09:00)`);
        continue;
      }

      // Una franja que termina antes de empezar se considera
      // abierta: el local cierra al día siguiente (bar de copas).
      if (slot.open !== slot.close && timeToMinutes(slot.close) > timeToMinutes(slot.open)) {
        if (timeToMinutes(slot.open) < previousClose) {
          errors.push(`${DAY_LABELS[day.day]}: las franjas no pueden solaparse`);
        }
        previousClose = timeToMinutes(slot.close);
      }
    }
  }

  return errors;
}

// ─── Formateo para la página pública ─────────────────

export function formatSlot(slot: TimeSlot): string {
  return `${slot.open} – ${slot.close}`;
}

export function formatDay(day: DayHours): string {
  if (day.closed) return "Cerrado";
  return day.slots.map(formatSlot).join(" · ");
}

// Indica si el local está abierto en este momento. Solo
// tiene sentido con mode "hours" (en "always" siempre está
// abierto y en "variable" no se puede saber).
export function isCurrentlyOpen(
  hours: OpeningHours | null,
  date?: Date | null,
): boolean {
  if (!hours || hours.mode !== "hours") return false;

  const ref = date ?? new Date();
  const now = ref.getHours() * 60 + ref.getMinutes();
  const today = jsDayToWeekDay(ref.getDay());

  const todayHours = hours.days.find((day) => day.day === today);
  if (todayHours && !todayHours.closed) {
    const openToday = todayHours.slots.some((slot) => {
      if (!isValidTime(slot.open) || !isValidTime(slot.close)) return false;

      const open = timeToMinutes(slot.open);
      const close = timeToMinutes(slot.close);

      // Franja normal (09:00 – 14:00).
      if (close > open) return now >= open && now < close;

      // Cierre al día siguiente (20:00 – 02:00): sigue abierta
      // mientras no llegue la hora de cierre.
      return now >= open || now < close;
    });

    if (openToday) return true;
  }

  // Una franja de ayer que termina de madrugada sigue abierta hoy.
  const yesterday = hours.days.find((day) => day.day === (today + 6) % 7);
  if (yesterday && !yesterday.closed) {
    const openYesterday = yesterday.slots.some((slot) => {
      if (!isValidTime(slot.open) || !isValidTime(slot.close)) return false;
      return timeToMinutes(slot.close) <= timeToMinutes(slot.open) && now < timeToMinutes(slot.close);
    });
    if (openYesterday) return true;
  }

  return false;
}

// Comprueba si el local tiene algún dato publicable.
export function hasStoreInfo(data: {
  address?: string | null;
  openingHours?: unknown;
  photos?: unknown;
}): boolean {
  const photos = Array.isArray(data.photos) ? data.photos : [];
  const hours = parseOpeningHours(data.openingHours);

  return !!data.address || photos.length > 0 || !!hours;
}