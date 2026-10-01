// ──────────────────────────────────────────────
// store-hours — Test Suite
// ──────────────────────────────────────────────
// Pruebas de la lógica de horarios del store locator:
// validación de franjas, parseo defensivo del JSON
// guardado en Prisma y cálculo de "abierto ahora".
//
// Convenio de días: 0 = lunes … 6 = domingo (nuestro),
// que no coincide con getDay() de JavaScript (0 = domingo).
// ──────────────────────────────────────────────

import {
  DEFAULT_OPENING_HOURS,
  DAY_LABELS,
  formatDay,
  hasStoreInfo,
  isCurrentlyOpen,
  isValidTime,
  jsDayToWeekDay,
  MAX_SLOTS_PER_DAY,
  parseOpeningHours,
  parseOpeningHoursOrDefault,
  validateOpeningHours,
  type OpeningHours,
} from '../store-hours';

// Septiembre de 2026: el 7 es lunes, el 8 martes y el 12 sábado.
const LUNES = (h: number, m: number) => new Date(2026, 8, 7, h, m);
const MARTES = (h: number, m: number) => new Date(2026, 8, 8, h, m);
const SABADO = (h: number, m: number) => new Date(2026, 8, 12, h, m);

// Clona los horarios por defecto cambiando un día concreto.
const withDay = (day: number, patch: Partial<OpeningHours['days'][number]>) => ({
  mode: 'hours' as const,
  days: DEFAULT_OPENING_HOURS.days.map((item) =>
    item.day === day ? { ...item, ...patch } : item,
  ),
});

describe('store-hours', () => {
  describe('jsDayToWeekDay', () => {
    it('traduce getDay() al día de la semana empezando en lunes', () => {
      expect(jsDayToWeekDay(1)).toBe(0); // lunes
      expect(jsDayToWeekDay(0)).toBe(6); // domingo
      expect(jsDayToWeekDay(6)).toBe(5); // sábado
    });

    it('mantiene el orden de las etiquetas', () => {
      expect(DAY_LABELS[jsDayToWeekDay(new Date(2026, 8, 7).getDay())]).toBe(
        'Lunes',
      );
    });
  });

  describe('isValidTime', () => {
    it('acepta HH:MM y rechaza formatos inválidos', () => {
      expect(isValidTime('09:00')).toBe(true);
      expect(isValidTime('23:59')).toBe(true);
      expect(isValidTime('9:00')).toBe(false);
      expect(isValidTime('25:00')).toBe(false);
      expect(isValidTime('09:60')).toBe(false);
      expect(isValidTime(null)).toBe(false);
    });
  });

  describe('validateOpeningHours', () => {
    it('acepta los horarios por defecto', () => {
      expect(validateOpeningHours(DEFAULT_OPENING_HOURS)).toEqual([]);
    });

    it('rechaza un día abierto sin franjas', () => {
      const errors = validateOpeningHours(withDay(1, { closed: false, slots: [] }));
      expect(errors.join()).toContain('Martes');
    });

    it('rechaza franjas solapadas', () => {
      const errors = validateOpeningHours(
        withDay(2, {
          closed: false,
          slots: [
            { open: '09:00', close: '14:00' },
            { open: '13:00', close: '20:00' },
          ],
        }),
      );
      expect(errors.join()).toContain('solaparse');
    });

    it('rechaza más de dos franjas por día', () => {
      const errors = validateOpeningHours(
        withDay(3, {
          closed: false,
          slots: [
            { open: '08:00', close: '10:00' },
            { open: '11:00', close: '13:00' },
            { open: '15:00', close: '20:00' },
          ],
        }),
      );
      expect(errors.join()).toContain(`máximo ${MAX_SLOTS_PER_DAY}`);
    });

    it('exige los 7 días de la semana', () => {
      const errors = validateOpeningHours({
        mode: 'hours',
        days: DEFAULT_OPENING_HOURS.days.slice(0, 6),
      });
      expect(errors.join()).toContain('7 días');
    });

    it('rechaza horas con formato incorrecto', () => {
      const errors = validateOpeningHours(
        withDay(4, { closed: false, slots: [{ open: '9:00', close: '25:00' }] }),
      );
      expect(errors.join()).toContain('HH:MM');
    });

    it('acepta una franja que cierra al día siguiente', () => {
      const errors = validateOpeningHours(
        withDay(4, { closed: false, slots: [{ open: '20:00', close: '02:00' }] }),
      );
      expect(errors).toEqual([]);
    });

    it('rechaza un modo de horario desconocido', () => {
      const errors = validateOpeningHours({
        mode: 'x' as OpeningHours['mode'],
        days: DEFAULT_OPENING_HOURS.days,
      });
      expect(errors.join()).toContain('tipo de horario');
    });

    it('rechaza un día de la semana inexistente', () => {
      const errors = validateOpeningHours({
        mode: 'hours',
        days: DEFAULT_OPENING_HOURS.days.map((item) =>
          item.day === 0 ? { ...item, day: 42 } : item,
        ),
      });
      expect(errors.join()).toContain('no válido');
    });
  });

  describe('isCurrentlyOpen', () => {
    it('devuelve false sin horarios', () => {
      expect(isCurrentlyOpen(null, LUNES(10, 0))).toBe(false);
    });

    it('calcula el horario por defecto del lunes a viernes', () => {
      expect(isCurrentlyOpen(DEFAULT_OPENING_HOURS, LUNES(10, 0))).toBe(true);
      expect(isCurrentlyOpen(DEFAULT_OPENING_HOURS, LUNES(12, 30))).toBe(true);
      expect(isCurrentlyOpen(DEFAULT_OPENING_HOURS, LUNES(17, 0))).toBe(true);
    });

    it('cierra en el descanso y al terminar la jornada', () => {
      expect(isCurrentlyOpen(DEFAULT_OPENING_HOURS, LUNES(15, 0))).toBe(false);
      expect(isCurrentlyOpen(DEFAULT_OPENING_HOURS, LUNES(20, 0))).toBe(false);
    });

    it('aún no abre antes de la primera franja', () => {
      expect(isCurrentlyOpen(DEFAULT_OPENING_HOURS, LUNES(8, 59))).toBe(false);
    });

    it('el fin de semana está cerrado por defecto', () => {
      expect(isCurrentlyOpen(DEFAULT_OPENING_HOURS, SABADO(10, 0))).toBe(false);
    });

    it('usa la fecha actual si no se le pasa ninguna', () => {
      expect(typeof isCurrentlyOpen(DEFAULT_OPENING_HOURS)).toBe('boolean');
    });

    it('no calcula nada en los modos always ni variable', () => {
      const closed: OpeningHours = {
        mode: 'always',
        days: DEFAULT_OPENING_HOURS.days.map((item) => ({
          ...item,
          closed: true,
          slots: [],
        })),
      };
      expect(isCurrentlyOpen(closed, LUNES(3, 0))).toBe(false);
      expect(
        isCurrentlyOpen({ ...closed, mode: 'variable' }, LUNES(10, 0)),
      ).toBe(false);
    });

    it('detecta una franja que sigue abierta de madrugada', () => {
      const soloLunesNoche: OpeningHours = {
        mode: 'hours',
        days: DEFAULT_OPENING_HOURS.days.map((item) =>
          item.day === 0
            ? { ...item, closed: false, slots: [{ open: '20:00', close: '02:00' }] }
            : { ...item, closed: true, slots: [] },
        ),
      };

      expect(isCurrentlyOpen(soloLunesNoche, LUNES(19, 59))).toBe(false);
      expect(isCurrentlyOpen(soloLunesNoche, LUNES(20, 0))).toBe(true);
      expect(isCurrentlyOpen(soloLunesNoche, LUNES(23, 0))).toBe(true);
      expect(isCurrentlyOpen(soloLunesNoche, MARTES(1, 0))).toBe(true);
      expect(isCurrentlyOpen(soloLunesNoche, MARTES(2, 0))).toBe(false);
      expect(isCurrentlyOpen(soloLunesNoche, MARTES(10, 0))).toBe(false);
    });
  });

  describe('parseOpeningHours', () => {
    it('devuelve null si no hay nada utilizable', () => {
      expect(parseOpeningHours(null)).toBeNull();
      expect(parseOpeningHours('basura')).toBeNull();
    });

    it('normaliza a 7 días', () => {
      expect(parseOpeningHours({})?.days).toHaveLength(7);
      expect(parseOpeningHours({})?.days.every((day) => day.closed)).toBe(true);
    });

    it('descarta franjas inválidas y solapadas', () => {
      const parsed = parseOpeningHours({
        mode: 'hours',
        days: [
          {
            day: 0,
            closed: false,
            slots: [
              { open: '09:00', close: '14:00' },
              { open: 'x', close: 'y' },
              { open: '12:00', close: '13:00' },
              { open: '10:00', close: '11:00' },
            ],
          },
        ],
      });

      expect(parsed?.days[0].slots).toEqual([{ open: '09:00', close: '14:00' }]);
    });

    it('respeta el máximo de franjas por día', () => {
      const parsed = parseOpeningHours({
        mode: 'hours',
        days: [
          {
            day: 0,
            closed: false,
            slots: [
              { open: '09:00', close: '14:00' },
              { open: '16:00', close: '20:00' },
              { open: '18:00', close: '19:00' },
            ],
          },
        ],
      });

      expect(parsed?.days[0].slots).toHaveLength(MAX_SLOTS_PER_DAY);
    });

    it('sustituye un modo desconocido por "hours"', () => {
      const parsed = parseOpeningHours({ mode: 'nope', days: [] });
      expect(parsed?.mode).toBe('hours');
    });

    it('el resultado siempre pasa la validación', () => {
      const parsed = parseOpeningHours({
        mode: 'variable',
        days: [{ day: 0, closed: false, slots: [{ open: '9', close: '9' }] }],
      });
      expect(parsed).not.toBeNull();
      expect(validateOpeningHours(parsed!)).toEqual([]);
    });
  });

  describe('parseOpeningHoursOrDefault', () => {
    it('devuelve el horario por defecto si no hay datos', () => {
      expect(parseOpeningHoursOrDefault(undefined).mode).toBe('hours');
      expect(validateOpeningHours(parseOpeningHoursOrDefault(null))).toEqual([]);
    });

    it('hace round-trip sin perder franjas válidas', () => {
      const roundTrip = parseOpeningHours({
        mode: 'hours',
        days: DEFAULT_OPENING_HOURS.days.map((day) => ({
          day: day.day,
          closed: day.closed,
          slots: day.slots,
        })),
      });

      expect(roundTrip).toEqual(DEFAULT_OPENING_HOURS);
      expect(validateOpeningHours(roundTrip!)).toEqual([]);
    });
  });

  describe('formatDay', () => {
    it('muestra todas las franjas del día', () => {
      expect(formatDay(DEFAULT_OPENING_HOURS.days[0])).toBe(
        '09:00 – 14:00 · 17:00 – 20:00',
      );
    });

    it('indica los días cerrados', () => {
      expect(formatDay(DEFAULT_OPENING_HOURS.days[5])).toBe('Cerrado');
    });
  });

  describe('hasStoreInfo', () => {
    it('devuelve false si el negocio no ha rellenado nada', () => {
      expect(hasStoreInfo({})).toBe(false);
      expect(hasStoreInfo({ photos: [] })).toBe(false);
    });

    it('devuelve true si hay dirección, fotos u horarios', () => {
      expect(hasStoreInfo({ address: 'Carrer X 1' })).toBe(true);
      expect(hasStoreInfo({ photos: [{ url: 'u', path: 'p' }] })).toBe(true);
      expect(
        hasStoreInfo({ openingHours: DEFAULT_OPENING_HOURS }),
      ).toBe(true);
    });
  });
});