'use client';

import { useCallback, useEffect, useState } from 'react';
import Button from '@/components/ui/button';
import {
  createPublicReservation,
  getPublicAvailability,
} from '@/actions/reservations';
import {
  addDaysKey,
  formatReservationDate,
  localDateKey,
  parseReservationConfig,
} from '@/lib/reservations';

type ReservationFormProps = {
  slug: string;
  reservationConfig: unknown;
};

const inputClass =
  'w-full px-3 py-2.5 border border-neutral-200 dark:border-neutral-700 rounded-md text-sm text-neutral-950 dark:text-neutral-100 bg-white dark:bg-neutral-800 outline-none transition-all duration-150 focus:border-neutral-950 dark:focus:border-neutral-400 focus:shadow-[0_0_0_2px_rgba(0,0,0,0.05)] placeholder:text-neutral-400';

const labelClass = 'block text-xs font-medium mb-[6px] text-neutral-500';

const REASON_MESSAGES: Record<string, string> = {
  closed: 'Cerrado ese día. Prueba con otra fecha.',
  past: 'Esa fecha ya ha pasado.',
  'too-far': 'No se puede reservar con tanta antelación.',
};

const ReservationForm = ({ slug, reservationConfig }: ReservationFormProps) => {
  const config = parseReservationConfig(reservationConfig);

  const [date, setDate] = useState('');
  const [dateBounds, setDateBounds] = useState({ min: '', max: '' });
  const [partySize, setPartySize] = useState(
    config.maxPartySize >= 2 ? 2 : 1,
  );
  const [time, setTime] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');

  const [slots, setSlots] = useState<string[]>([]);
  const [reason, setReason] = useState('');
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [confirmed, setConfirmed] = useState<{
    date: string;
    time: string;
    partySize: number;
  } | null>(null);

  useEffect(() => {
    const today = localDateKey(new Date());
    setDateBounds({ min: today, max: addDaysKey(today, config.maxAdvanceDays) });
    setDate(today);
  }, [config.maxAdvanceDays]);

  const loadAvailability = useCallback(async () => {
    if (!date) return;
    setLoadingSlots(true);
    setError('');
    setTime('');
    const result = await getPublicAvailability(slug, date, {
      partySize,
      tzOffsetMinutes: new Date().getTimezoneOffset(),
    });
    if (result.success) {
      setSlots(result.slots ?? []);
      setReason(result.reason ?? '');
    } else {
      setSlots([]);
      setReason('');
      setError(result.error ?? 'No se pudo consultar la disponibilidad');
    }
    setLoadingSlots(false);
  }, [slug, date, partySize]);

  useEffect(() => {
    loadAvailability();
  }, [loadAvailability]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!time) {
      setError('Elige una hora para tu reserva');
      return;
    }
    setSubmitting(true);
    setError('');

    const result = await createPublicReservation({
      slug,
      name,
      email,
      phone,
      notes,
      date,
      time,
      partySize,
      tzOffsetMinutes: new Date().getTimezoneOffset(),
    });

    if (result.success && result.reservation) {
      setConfirmed(result.reservation);
    } else {
      setError(result.error ?? 'No se pudo crear la reserva');
      loadAvailability();
    }
    setSubmitting(false);
  };

  if (confirmed) {
    return (
      <div
        id="reservar"
        className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm w-full max-w-md p-8 mt-4 scroll-mt-20"
      >
        <span className="inline-block text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 mb-3">
          Reserva confirmada
        </span>
        <h2 className="text-xl font-semibold mb-1">
          ¡Nos vemos pronto, {name.trim().split(' ')[0]}!
        </h2>
        <p className="text-sm text-neutral-500 mb-4">
          Tu mesa está reservada. Te hemos enviado la confirmación por email.
        </p>
        <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-4 flex flex-col gap-1 text-sm">
          <p className="font-medium">{formatReservationDate(confirmed.date)}</p>
          <p className="text-neutral-600 dark:text-neutral-300">
            {confirmed.time} · {confirmed.partySize} comensal
            {confirmed.partySize !== 1 ? 'es' : ''}
          </p>
        </div>
        <div className="mt-5">
          <Button
            variant="secondary"
            type="button"
            onClick={() => {
              setConfirmed(null);
              setTime('');
              loadAvailability();
            }}
          >
            Hacer otra reserva
          </Button>
        </div>
      </div>
    );
  }

  const partySizeOptions = Array.from(
    { length: config.maxPartySize },
    (_, index) => index + 1,
  );

  return (
    <div
      id="reservar"
      className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm w-full max-w-md p-8 mt-4 scroll-mt-20"
    >
      <h2 className="text-xl font-semibold mb-1">Reservar mesa</h2>
      <p className="text-xs text-neutral-400 mb-4">
        Elige día, hora y comensales. Confirmación al instante.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex gap-3">
          <div className="flex-1 min-w-0">
            <label className={labelClass} htmlFor="reservation-party">
              Comensales
            </label>
            <select
              id="reservation-party"
              value={partySize}
              onChange={(event) => setPartySize(Number(event.target.value))}
              className={inputClass}
            >
              {partySizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-0">
            <label className={labelClass} htmlFor="reservation-date">
              Día
            </label>
            <input
              id="reservation-date"
              type="date"
              required
              value={date}
              min={dateBounds.min}
              max={dateBounds.max}
              onChange={(event) => setDate(event.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <span className={labelClass}>Hora</span>
          {loadingSlots ? (
            <p className="text-xs text-neutral-400">Cargando horarios...</p>
          ) : slots.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {slots.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setTime(slot)}
                  className={`px-3 py-1.5 rounded-md border text-xs font-medium transition-colors cursor-pointer ${
                    time === slot
                      ? 'border-neutral-950 bg-neutral-950 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-950'
                      : 'border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:border-neutral-950 dark:hover:border-neutral-400'
                  }`}
                >
                  {slot}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-neutral-400">
              {REASON_MESSAGES[reason] ?? 'No hay huecos disponibles ese día.'}
            </p>
          )}
        </div>

        <div>
          <label className={labelClass} htmlFor="reservation-name">
            Nombre
          </label>
          <input
            id="reservation-name"
            type="text"
            required
            minLength={2}
            maxLength={80}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Tu nombre"
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="reservation-email">
            Correo electrónico
          </label>
          <input
            id="reservation-email"
            type="email"
            required
            maxLength={120}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="tu@email.com"
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="reservation-phone">
            Teléfono <span className="text-neutral-300 dark:text-neutral-600">(opcional)</span>
          </label>
          <input
            id="reservation-phone"
            type="tel"
            maxLength={20}
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="+34 600 000 000"
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="reservation-notes">
            Notas <span className="text-neutral-300 dark:text-neutral-600">(opcional)</span>
          </label>
          <textarea
            id="reservation-notes"
            maxLength={500}
            rows={2}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Alergias, carrito, terraza..."
            className={`${inputClass} resize-none`}
          />
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <Button type="submit" disabled={submitting || !time}>
          {submitting ? 'Reservando...' : 'Reservar mesa'}
        </Button>
      </form>
    </div>
  );
};

export default ReservationForm;
