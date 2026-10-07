import {
  computeAvailableSlots,
  formatReservationDate,
  getSlotTimes,
  parseReservationConfig,
  validateReservationConfig,
  DEFAULT_RESERVATION_CONFIG,
  type ReservationConfig,
} from '@/lib/reservations';
import { DEFAULT_OPENING_HOURS, type OpeningHours } from '@/lib/store-hours';

const buildHours = (patch: Partial<OpeningHours> = {}): OpeningHours => ({
  ...DEFAULT_OPENING_HOURS,
  ...patch,
});

const config = (overrides: Partial<ReservationConfig> = {}): ReservationConfig => ({
  ...DEFAULT_RESERVATION_CONFIG,
  enabled: true,
  ...overrides,
});

describe('parseReservationConfig', () => {
  it('devuelve los valores por defecto si no hay configuración', () => {
    expect(parseReservationConfig(null)).toEqual(DEFAULT_RESERVATION_CONFIG);
    expect(parseReservationConfig('garbage')).toEqual(DEFAULT_RESERVATION_CONFIG);
  });

  it('normaliza valores fuera de rango', () => {
    const parsed = parseReservationConfig({
      enabled: true,
      slotIntervalMinutes: 17,
      capacityPerSlot: 0,
      maxPartySize: 999,
      maxAdvanceDays: -5,
    });

    expect(parsed.enabled).toBe(true);
    expect(parsed.slotIntervalMinutes).toBe(DEFAULT_RESERVATION_CONFIG.slotIntervalMinutes);
    expect(parsed.capacityPerSlot).toBe(1);
    expect(parsed.maxPartySize).toBe(100);
    expect(parsed.maxAdvanceDays).toBe(1);
  });

  it('acepta intervalos válidos', () => {
    expect(parseReservationConfig({ slotIntervalMinutes: 60 }).slotIntervalMinutes).toBe(60);
    expect(parseReservationConfig({ slotIntervalMinutes: 15 }).slotIntervalMinutes).toBe(15);
    expect(parseReservationConfig({ slotIntervalMinutes: 45 }).slotIntervalMinutes).toBe(
      DEFAULT_RESERVATION_CONFIG.slotIntervalMinutes,
    );
  });
});

describe('validateReservationConfig', () => {
  it('acepta la configuración por defecto', () => {
    expect(validateReservationConfig({ ...DEFAULT_RESERVATION_CONFIG, enabled: true })).toEqual([]);
  });

  it('rechaza un máximo por reserva mayor que la capacidad', () => {
    const errors = validateReservationConfig(
      config({ capacityPerSlot: 4, maxPartySize: 10 }),
    );
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe('getSlotTimes', () => {
  it('genera franjas cada intervalo dentro del horario del día', () => {
    const hours = buildHours();
    const times = getSlotTimes(hours, '2026-10-05', 30);

    expect(times).toContain('09:00');
    expect(times).toContain('13:30');
    expect(times).not.toContain('14:00');
    expect(times).toContain('17:00');
    expect(times).toContain('19:30');
    expect(times).not.toContain('20:00');
  });

  it('devuelve vacío si el día está cerrado', () => {
    const hours = buildHours({
      days: DEFAULT_OPENING_HOURS.days.map((day) =>
        day.day === 2 ? { ...day, closed: true, slots: [] } : day,
      ),
    });

    expect(getSlotTimes(hours, '2026-10-07', 30)).toEqual([]);
  });

  it('devuelve vacío con horario variable', () => {
    expect(getSlotTimes(buildHours({ mode: 'variable' }), '2026-10-05', 30)).toEqual([]);
  });

  it('cubre todo el día con horario 24 horas', () => {
    const times = getSlotTimes(buildHours({ mode: 'always' }), '2026-10-05', 60);
    expect(times).toHaveLength(24);
    expect(times[0]).toBe('00:00');
    expect(times[23]).toBe('23:00');
  });

  it('corta la franja overnight en medianoche', () => {
    const hours = buildHours({
      days: DEFAULT_OPENING_HOURS.days.map((day) =>
        day.day === 4
          ? { ...day, closed: false, slots: [{ open: '20:00', close: '02:00' }] }
          : { ...day, closed: true, slots: [] },
      ),
    });

    const times = getSlotTimes(hours, '2026-10-09', 60);
    expect(times).toEqual(['20:00', '21:00', '22:00', '23:00']);
  });

  it('devuelve vacío con una fecha inválida', () => {
    expect(getSlotTimes(buildHours(), '2026-13-45', 30)).toEqual([]);
  });
});

describe('computeAvailableSlots', () => {
  const now = new Date('2026-10-07T10:30:00Z');
  const hours = buildHours();

  it('rechaza si las reservas están desactivadas', () => {
    const result = computeAvailableSlots({
      hours,
      config: config({ enabled: false }),
      date: '2026-10-07',
      reservations: [],
      now,
    });
    expect(result.reason).toBe('disabled');
  });

  it('rechaza fechas pasadas y demasiado lejanas', () => {
    expect(
      computeAvailableSlots({
        hours,
        config: config(),
        date: '2026-10-06',
        reservations: [],
        now,
      }).reason,
    ).toBe('past');

    expect(
      computeAvailableSlots({
        hours,
        config: config({ maxAdvanceDays: 30 }),
        date: '2026-11-10',
        reservations: [],
        now,
      }).reason,
    ).toBe('too-far');
  });

  it('filtra las franjas anteriores a la hora mínima de aviso', () => {
    const result = computeAvailableSlots({
      hours,
      config: config({ slotIntervalMinutes: 60 }),
      date: '2026-10-07',
      reservations: [],
      now,
    });

    expect(result.slots).not.toContain('10:00');
    expect(result.slots).not.toContain('11:00');
    expect(result.slots).toContain('12:00');
    expect(result.slots).toContain('13:00');
  });

  it('tiene en cuenta la franja horaria del navegador', () => {
    const result = computeAvailableSlots({
      hours,
      config: config({ slotIntervalMinutes: 60 }),
      date: '2026-10-07',
      reservations: [],
      now,
      tzOffsetMinutes: -120,
    });

    expect(result.slots).not.toContain('12:00');
    expect(result.slots).not.toContain('13:00');
    expect(result.slots).toContain('17:00');
  });

  it('descuenta la ocupación de las franjas', () => {
    const result = computeAvailableSlots({
      hours,
      config: config({ slotIntervalMinutes: 60, capacityPerSlot: 4 }),
      date: '2026-10-07',
      reservations: [
        { time: '13:00', partySize: 2, status: 'confirmed' },
        { time: '13:00', partySize: 2, status: 'completed' },
      ],
      now,
      partySize: 1,
    });

    expect(result.slots).not.toContain('13:00');
    expect(result.slots).toContain('12:00');
  });

  it('una reserva cancelada no ocupa capacidad', () => {
    const result = computeAvailableSlots({
      hours,
      config: config({ slotIntervalMinutes: 60, capacityPerSlot: 4 }),
      date: '2026-10-07',
      reservations: [{ time: '13:00', partySize: 4, status: 'cancelled' }],
      now,
      partySize: 4,
    });

    expect(result.slots).toContain('13:00');
  });

  it('filtra franjas donde no cabe el grupo completo', () => {
    const result = computeAvailableSlots({
      hours,
      config: config({ slotIntervalMinutes: 60, capacityPerSlot: 4 }),
      date: '2026-10-07',
      reservations: [{ time: '13:00', partySize: 3, status: 'confirmed' }],
      now,
      partySize: 2,
    });

    expect(result.slots).not.toContain('13:00');
    expect(result.slots).toContain('12:00');
  });
});

describe('formatReservationDate', () => {
  it('formatea la fecha en español', () => {
    expect(formatReservationDate('2026-10-07')).toBe('miércoles, 7 de octubre de 2026');
  });
});
