'use client';

// ─── Sección: Reservas ──────────────────────────────
// Configuración del sistema de reservas y agenda de las
// reservas entrantes de la página pública /{slug}.
// ────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from 'react';
import Button from '@/components/ui/button';
import { useBusiness } from '@/components/business-context';
import {
  getReservations,
  updateReservationConfig,
  updateReservationStatus,
  type ReservationListItem,
} from '@/actions/reservations';
import {
  DEFAULT_RESERVATION_CONFIG,
  SLOT_INTERVAL_OPTIONS,
  formatReservationDate,
  localDateKey,
  parseReservationConfig,
  type ReservationConfig,
  type ReservationStatus,
} from '@/lib/reservations';

type ReservationsSectionProps = {
  businessId: string;
};

const inputClass =
  'w-full px-3 py-2.5 border border-neutral-200 dark:border-neutral-700 rounded-md text-sm text-neutral-950 dark:text-neutral-100 bg-white dark:bg-neutral-800 outline-none focus:border-neutral-950 dark:focus:border-neutral-400 focus:shadow-[0_0_0_2px_rgba(0,0,0,0.05)]';

const labelClass = 'block text-xs font-medium mb-[6px] text-neutral-500';

const STATUS_LABELS: Record<string, string> = {
  confirmed: 'Confirmada',
  completed: 'Completada',
  cancelled: 'Cancelada',
};

const STATUS_CLASSES: Record<string, string> = {
  confirmed: 'bg-emerald-100 text-emerald-700',
  completed: 'bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300',
  cancelled: 'bg-red-100 text-red-600',
};

const ReservationsSection = ({ businessId }: ReservationsSectionProps) => {
  const { business, reload } = useBusiness();

  const [config, setConfig] = useState<ReservationConfig>(() =>
    parseReservationConfig(business?.reservationConfig ?? DEFAULT_RESERVATION_CONFIG),
  );
  const [savingConfig, setSavingConfig] = useState(false);

  const [fromDate, setFromDate] = useState(() => localDateKey(new Date()));
  const [reservations, setReservations] = useState<ReservationListItem[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState('');

  const loadReservations = useCallback(async () => {
    setLoadingList(true);
    setError('');
    const result = await getReservations(businessId, fromDate);
    if (result.success) {
      setReservations(result.reservations ?? []);
    } else {
      setError(result.error ?? 'No se pudieron cargar las reservas');
    }
    setLoadingList(false);
  }, [businessId, fromDate]);

  useEffect(() => {
    loadReservations();
  }, [loadReservations]);

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    setMsg('');
    setError('');
    const result = await updateReservationConfig(businessId, config);
    if (result.success && result.config) {
      setConfig(result.config);
      setMsg('Guardado correctamente');
      reload();
    } else {
      setError(result.error ?? 'No se pudo guardar');
    }
    setSavingConfig(false);
  };

  const handleStatus = async (reservationId: string, status: ReservationStatus) => {
    setUpdatingId(reservationId);
    setError('');
    const result = await updateReservationStatus(businessId, reservationId, status);
    if (result.success) {
      await loadReservations();
    } else {
      setError(result.error ?? 'No se pudo actualizar la reserva');
    }
    setUpdatingId('');
  };

  const publicUrl = business?.slug ? `/${business.slug}/reservas` : null;
  const filtered =
    statusFilter === 'all'
      ? reservations
      : reservations.filter((item) => item.status === statusFilter);

  const grouped = filtered.reduce<Record<string, ReservationListItem[]>>(
    (acc, item) => {
      (acc[item.date] ??= []).push(item);
      return acc;
    },
    {},
  );

  const patchConfig = (patch: Partial<ReservationConfig>) =>
    setConfig((prev) => ({ ...prev, ...patch }));

  return (
    <div className="flex flex-col gap-8 stagger">
      {/* ── Configuración ─────────────────────── */}
      <div>
        <h3 className="text-sm font-semibold mb-1">Configuración de reservas</h3>
        <p className="text-xs text-neutral-400 mb-3">
          Los clientes reservan desde tu página pública. La capacidad se calcula
          por franja según tus horarios de apertura.
        </p>

        <div className="flex flex-col gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(event) => patchConfig({ enabled: event.target.checked })}
              className="w-4 h-4 border border-neutral-300 dark:border-neutral-600 rounded-sm accent-neutral-950 dark:accent-neutral-100"
            />
            <span className="text-xs text-neutral-600 dark:text-neutral-300">
              Activar reservas online
            </span>
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className={labelClass} htmlFor="res-interval">
                Intervalo entre franjas
              </label>
              <select
                id="res-interval"
                value={config.slotIntervalMinutes}
                onChange={(event) =>
                  patchConfig({ slotIntervalMinutes: Number(event.target.value) })
                }
                className={inputClass}
              >
                {SLOT_INTERVAL_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    cada {option} min
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass} htmlFor="res-capacity">
                Comensales por franja
              </label>
              <input
                id="res-capacity"
                type="number"
                min={1}
                max={500}
                value={config.capacityPerSlot}
                onChange={(event) =>
                  patchConfig({ capacityPerSlot: Number(event.target.value) })
                }
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="res-party">
                Máx. comensales por reserva
              </label>
              <input
                id="res-party"
                type="number"
                min={1}
                max={100}
                value={config.maxPartySize}
                onChange={(event) =>
                  patchConfig({ maxPartySize: Number(event.target.value) })
                }
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="res-advance">
                Días máximos de antelación
              </label>
              <input
                id="res-advance"
                type="number"
                min={1}
                max={365}
                value={config.maxAdvanceDays}
                onChange={(event) =>
                  patchConfig({ maxAdvanceDays: Number(event.target.value) })
                }
                className={inputClass}
              />
            </div>
          </div>

          {config.enabled && !business?.openingHours && (
            <p className="text-xs text-amber-600">
              Configura tus horarios de apertura en la pestaña «Mi local» para
              que se generen las franjas de reserva.
            </p>
          )}

          {publicUrl && config.enabled && (
            <a
              href={publicUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 underline underline-offset-2 w-fit"
            >
              Ver el formulario en tu página pública
            </a>
          )}

          <div className="flex flex-col gap-2">
            {msg && <p className="text-xs text-emerald-600">{msg}</p>}
            <div>
              <Button
                variant="primary"
                type="button"
                onClick={handleSaveConfig}
                disabled={savingConfig}
              >
                {savingConfig ? 'Guardando...' : 'Guardar configuración'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Agenda ────────────────────────────── */}
      <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800">
        <h3 className="text-sm font-semibold mb-1">Reservas</h3>
        <p className="text-xs text-neutral-400 mb-3">
          Próximas reservas desde la fecha elegida.
        </p>

        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <input
            type="date"
            value={fromDate}
            onChange={(event) => setFromDate(event.target.value)}
            className={`${inputClass} sm:w-44`}
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className={`${inputClass} sm:w-44`}
          >
            <option value="all">Todos los estados</option>
            <option value="confirmed">Confirmadas</option>
            <option value="completed">Completadas</option>
            <option value="cancelled">Canceladas</option>
          </select>
          <Button variant="secondary" type="button" onClick={loadReservations} disabled={loadingList}>
            {loadingList ? 'Cargando...' : 'Actualizar'}
          </Button>
        </div>

        {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

        {filtered.length === 0 ? (
          <p className="text-xs text-neutral-400">No hay reservas en ese periodo.</p>
        ) : (
          <div className="flex flex-col gap-5">
            {Object.entries(grouped).map(([date, items]) => (
              <div key={date}>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-2">
                  {formatReservationDate(date)}
                </h4>
                <ul className="flex flex-col gap-2">
                  {items.map((reservation) => (
                    <li
                      key={reservation.id}
                      className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3"
                    >
                      <span className="text-sm font-medium sm:w-16 shrink-0">
                        {reservation.time}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {reservation.name}{' '}
                          <span className="text-neutral-400 font-normal">
                            · {reservation.partySize} pax
                          </span>
                        </p>
                        <p className="text-xs text-neutral-500 truncate">
                          {reservation.email}
                          {reservation.phone ? ` · ${reservation.phone}` : ''}
                        </p>
                        {reservation.notes && (
                          <p className="text-xs text-neutral-400 mt-1">{reservation.notes}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${STATUS_CLASSES[reservation.status] ?? ''}`}
                        >
                          {STATUS_LABELS[reservation.status] ?? reservation.status}
                        </span>
                        {reservation.status === 'confirmed' && (
                          <>
                            <button
                              type="button"
                              disabled={updatingId === reservation.id}
                              onClick={() => handleStatus(reservation.id, 'completed')}
                              className="text-xs font-medium text-neutral-500 hover:text-neutral-950 dark:hover:text-neutral-100 transition-colors cursor-pointer disabled:opacity-50"
                            >
                              Completar
                            </button>
                            <button
                              type="button"
                              disabled={updatingId === reservation.id}
                              onClick={() => handleStatus(reservation.id, 'cancelled')}
                              className="text-xs font-medium text-neutral-500 hover:text-red-500 transition-colors cursor-pointer disabled:opacity-50"
                            >
                              Cancelar
                            </button>
                          </>
                        )}
                        {reservation.status === 'cancelled' && (
                          <button
                            type="button"
                            disabled={updatingId === reservation.id}
                            onClick={() => handleStatus(reservation.id, 'confirmed')}
                            className="text-xs font-medium text-neutral-500 hover:text-neutral-950 dark:hover:text-neutral-100 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            Reabrir
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReservationsSection;
