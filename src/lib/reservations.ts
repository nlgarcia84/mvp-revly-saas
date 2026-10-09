import {
  jsDayToWeekDay,
  type DayHours,
  type OpeningHours,
} from '@/lib/store-hours';

export type ReservationConfig = {
  enabled: boolean;
  slotIntervalMinutes: number;
  maxPartySize: number;
  maxAdvanceDays: number;
};

export const DEFAULT_RESERVATION_CONFIG: ReservationConfig = {
  enabled: false,
  slotIntervalMinutes: 30,
  maxPartySize: 8,
  maxAdvanceDays: 30,
};

export const SLOT_INTERVAL_OPTIONS = [15, 30, 60];

export const MIN_NOTICE_MINUTES = 60;

export type ReservationStatus = 'confirmed' | 'completed' | 'cancelled';

export const RESERVATION_STATUSES: ReservationStatus[] = [
  'confirmed',
  'completed',
  'cancelled',
];

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

const DAY_MS = 24 * 60 * 60 * 1000;

export function isValidDate(value: unknown): value is string {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  );
}

export function isValidTimeString(value: unknown): value is string {
  return typeof value === 'string' && TIME_PATTERN.test(value);
}

function toBoundedInt(
  value: unknown,
  min: number,
  max: number,
  fallback: number,
): number {
  const n =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim() !== ''
        ? Number(value)
        : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

export function parseReservationConfig(value: unknown): ReservationConfig {
  if (!value || typeof value !== 'object') {
    return { ...DEFAULT_RESERVATION_CONFIG };
  }

  const raw = value as Record<string, unknown>;
  const interval = toBoundedInt(
    raw.slotIntervalMinutes,
    15,
    120,
    DEFAULT_RESERVATION_CONFIG.slotIntervalMinutes,
  );

  return {
    enabled: raw.enabled === true,
    slotIntervalMinutes: SLOT_INTERVAL_OPTIONS.includes(interval)
      ? interval
      : DEFAULT_RESERVATION_CONFIG.slotIntervalMinutes,
    maxPartySize: toBoundedInt(
      raw.maxPartySize,
      1,
      100,
      DEFAULT_RESERVATION_CONFIG.maxPartySize,
    ),
    maxAdvanceDays: toBoundedInt(
      raw.maxAdvanceDays,
      1,
      365,
      DEFAULT_RESERVATION_CONFIG.maxAdvanceDays,
    ),
  };
}

export function validateReservationConfig(value: ReservationConfig): string[] {
  const errors: string[] = [];

  if (!SLOT_INTERVAL_OPTIONS.includes(value.slotIntervalMinutes)) {
    errors.push('El intervalo entre franjas no es válido');
  }
  if (value.maxPartySize < 1 || value.maxPartySize > 100) {
    errors.push('El máximo de comensales por reserva debe estar entre 1 y 100');
  }
  if (value.maxAdvanceDays < 1 || value.maxAdvanceDays > 365) {
    errors.push('Los días de antelación deben estar entre 1 y 365');
  }

  return errors;
}

function minutesToTime(total: number): string {
  const hours = Math.floor(total / 60) % 24;
  const minutes = total % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

function expandRange(open: string, close: string, interval: number): string[] {
  const start = timeToMinutes(open);
  let end = timeToMinutes(close);
  if (end <= start) end += 24 * 60;

  const times: string[] = [];
  for (let t = start; t + interval <= end && t < 24 * 60; t += interval) {
    times.push(minutesToTime(t));
  }
  return times;
}

function daySlotTimes(day: DayHours, interval: number): string[] {
  if (day.closed || interval < 15) return [];
  return day.slots.flatMap((slot) => expandRange(slot.open, slot.close, interval));
}

export function getSlotTimes(
  hours: OpeningHours | null,
  date: string,
  interval: number,
): string[] {
  if (!hours || !isValidDate(date)) return [];

  const jsDay = new Date(`${date}T00:00:00Z`).getUTCDay();
  const weekDay = jsDayToWeekDay(jsDay);
  const day = hours.days.find((item) => item.day === weekDay);
  if (!day) return [];

  if (hours.mode === 'always') {
    const times: string[] = [];
    for (let t = 0; t + interval <= 24 * 60; t += interval) {
      times.push(minutesToTime(t));
    }
    return times;
  }

  if (hours.mode === 'variable') return [];

  return [...new Set(daySlotTimes(day, interval))].sort();
}

function dateKey(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function daysBetween(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  return Math.round((b - a) / DAY_MS);
}

export type ReservationSlotRecord = {
  time: string;
  status: string;
};

export type AvailabilityReason = 'disabled' | 'invalid-date' | 'past' | 'too-far' | 'closed';

export function computeAvailableSlots({
  hours,
  config,
  date,
  reservations,
  now,
  tzOffsetMinutes = 0,
}: {
  hours: OpeningHours | null;
  config: ReservationConfig;
  date: string;
  reservations: ReservationSlotRecord[];
  now?: Date;
  tzOffsetMinutes?: number;
}): { slots: string[]; reason?: AvailabilityReason } {
  if (!config.enabled) return { slots: [], reason: 'disabled' };
  if (!isValidDate(date)) return { slots: [], reason: 'invalid-date' };

  const ref = new Date((now ?? new Date()).getTime() - tzOffsetMinutes * 60000);
  const todayKey = dateKey(ref);

  if (date < todayKey) return { slots: [], reason: 'past' };
  if (daysBetween(todayKey, date) > config.maxAdvanceDays) {
    return { slots: [], reason: 'too-far' };
  }

  const takenTimes = new Set<string>();
  for (const reservation of reservations) {
    if (reservation.status === 'cancelled') continue;
    takenTimes.add(reservation.time);
  }

  const earliest = ref.getTime() + MIN_NOTICE_MINUTES * 60 * 1000;
  const candidates = getSlotTimes(hours, date, config.slotIntervalMinutes);

  const slots = candidates.filter((time) => {
    if (takenTimes.has(time)) return false;
    const start = Date.parse(`${date}T${time}:00Z`);
    return start >= earliest;
  });

  return { slots };
}

export function formatReservationDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

export function addDaysKey(dateKeyBase: string, days: number): string {
  const [y, m, d] = dateKeyBase.split('-').map(Number);
  return dateKey(new Date(Date.UTC(y, m - 1, d) + days * DAY_MS));
}

export function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;
}
