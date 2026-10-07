'use client';

// ─── Tabla de clientes ───────────────────────────────
// Lista paginada y filtrable de la base de clientes, con las
// acciones de cada fila (puntos, email, WhatsApp, detalle, borrar)
// y las acciones masivas (envío de emails, borrado).
//
// La paginación y la búsqueda viven en el servidor: sin ellas la
// tabla crece sin límite y cada cambio de filtro reenvía todas las
// filas al cliente.
//
// Los modales (añadir, CSV, ficha) viven fuera: este componente solo
// notifica al padre qué quiere abrir mediante callbacks.
// ────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from 'react';
import {
  deleteCustomer,
  deleteSelectedCustomers,
  getCustomers,
  type CustomerRow,
} from '@/actions/customers';
import {
  addPointToCustomer,
  subtractPointFromCustomer,
} from '@/actions/points';
import { sendBatchInvitations, sendInvitation } from '@/actions/send';
import ActionMenu from '@/components/customer-row-actions';
import Button from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const statusLabel: Record<string, string> = {
  pending: 'Pendiente',
  invited: 'Invitado',
  completed: 'Completado',
};

const statusColor: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  invited: 'bg-blue-100 text-blue-700',
  completed: 'bg-emerald-100 text-emerald-700',
};

const PAGE_SIZE = 25;

const CustomersTable = ({
  businessId,
  businessName,
  onAdd,
  onImportCsv,
  onShowDetail,
}: {
  businessId: string;
  businessName: string;
  onAdd: () => void;
  onImportCsv: () => void;
  onShowDetail: (customer: CustomerRow) => void;
}) => {
  const [data, setData] = useState<{
    customers: CustomerRow[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }>({ customers: [], total: 0, page: 1, pageSize: PAGE_SIZE, totalPages: 0 });
  const [filter, setFilter] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [q, setQ] = useState('');
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [batchSending, setBatchSending] = useState(false);
  const [dropdownId, setDropdownId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const result = await getCustomers(businessId, {
      status: filter,
      q,
      page: data.page,
      pageSize: PAGE_SIZE,
    });
    setData(result);
  }, [businessId, filter, q, data.page]);

  useEffect(() => {
    load();
  }, [load]);

  // Búsqueda con debounce: esperamos 300 ms tras la última pulsación
  // para no llamar al servidor en cada tecla.
  useEffect(() => {
    const t = setTimeout(() => setQ(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Al cambiar el filtro o la búsqueda volvemos a la primera página.
  useEffect(() => {
    setData((prev) => ({ ...prev, page: 1 }));
  }, [filter, q]);

  const handleAddPoint = async (customerId: string) => {
    const result = await addPointToCustomer(customerId);
    if (result.success) {
      setData((prev) => ({
        ...prev,
        customers: prev.customers.map((c) =>
          c.id === customerId ? { ...c, points: result.points } : c,
        ),
      }));
    } else {
      alert(result.error);
    }
    setDropdownId(null);
  };

  const handleSubtractPoint = async (customerId: string) => {
    const result = await subtractPointFromCustomer(customerId);
    if (result.success) {
      setData((prev) => ({
        ...prev,
        customers: prev.customers.map((c) =>
          c.id === customerId ? { ...c, points: result.points } : c,
        ),
      }));
    } else {
      alert(result.error);
    }
    setDropdownId(null);
  };

  const handleSend = async (customerId: string) => {
    setSendingId(customerId);
    try {
      await sendInvitation(customerId);
      setData((prev) => ({
        ...prev,
        customers: prev.customers.map((c) =>
          c.id === customerId ? { ...c, status: 'invited' } : c,
        ),
      }));
    } catch (e) {
      alert('Error al enviar: ' + (e instanceof Error ? e.message : 'desconocido'));
    }
    setSendingId(null);
    setDropdownId(null);
  };

  const toggleSelect = (customerId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(customerId)) next.delete(customerId);
      else next.add(customerId);
      return next;
    });
  };

  // "Seleccionar todos" actúa sobre la página visible, no sobre toda
  // la base de datos: seleccionar cientos de clientes ocultos no
  // tendría sentido y haría la barra de acciones inutilizable.
  const toggleAll = () => {
    if (selected.size === data.customers.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(data.customers.map((c) => c.id)));
    }
  };

  const handleBatchSend = async () => {
    setBatchSending(true);
    const ids = Array.from(selected);
    const { sent, failed } = await sendBatchInvitations(ids);
    await load();
    setSelected(new Set());
    setBatchSending(false);
    if (failed > 0) {
      alert(
        `Enviados: ${sent} | Fallos: ${failed}. Revisa la consola para más detalles.`,
      );
    }
  };

  const handleDelete = async (customerId: string) => {
    if (!confirm('¿Eliminar este cliente?')) return;
    try {
      await deleteCustomer(customerId);
      setData((prev) => ({
        ...prev,
        customers: prev.customers.filter((c) => c.id !== customerId),
      }));
    } catch (e) {
      alert(
        'Error al eliminar: ' + (e instanceof Error ? e.message : 'desconocido'),
      );
    }
    setDropdownId(null);
  };

  const handleDeleteSelected = async () => {
    const ids = Array.from(selected);
    if (
      !confirm(
        `¿Eliminar ${ids.length} cliente${ids.length !== 1 ? 's' : ''} seleccionado${ids.length !== 1 ? 's' : ''}?`,
      )
    )
      return;
    try {
      await deleteSelectedCustomers(ids);
      await load();
      setSelected(new Set());
    } catch (e) {
      alert(
        'Error al eliminar: ' + (e instanceof Error ? e.message : 'desconocido'),
      );
    }
  };

  const allSelected =
    selected.size === data.customers.length && data.customers.length > 0;
  const rangeStart = data.total === 0 ? 0 : (data.page - 1) * data.pageSize + 1;
  const rangeEnd = Math.min(data.total, data.page * data.pageSize);

  return (
    <div className="flex flex-col gap-4 stagger">
      {/* Toolbar: búsqueda, filtros y acciones */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Buscar por nombre, email o teléfono…"
          aria-label="Buscar clientes"
          className="w-full sm:max-w-xs px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-md text-sm bg-white dark:bg-neutral-800 text-neutral-950 dark:text-neutral-100 outline-none focus:border-neutral-950 dark:focus:border-neutral-400"
        />
        <div className="flex items-center gap-2 flex-wrap">
          {['all', 'pending', 'invited', 'completed'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-[11px] px-2.5 py-1 rounded-md border transition-colors cursor-pointer ${
                filter === f
                  ? 'border-neutral-950 dark:border-neutral-100 bg-neutral-950 dark:bg-neutral-100 text-white dark:text-neutral-950'
                  : 'border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:border-neutral-950 dark:hover:border-neutral-100'
              }`}
            >
              {f === 'all' ? 'Todos' : statusLabel[f]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 sm:ml-auto">
          <Button
            variant="secondary"
            className="!px-3 !py-1.5 text-xs"
            onClick={onAdd}
          >
            + Añadir cliente
          </Button>
          <Button
            variant="secondary"
            className="!px-3 !py-1.5 text-xs"
            onClick={onImportCsv}
          >
            Importar CSV
          </Button>
        </div>
      </div>

      {/* Acciones masivas */}
      {selected.size > 0 && (
        <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950/10 rounded-lg px-4 py-2">
          <span className="text-xs text-blue-700 dark:text-blue-300">
            {selected.size} seleccionado{selected.size !== 1 ? 's' : ''}
          </span>
          <Button
            variant="primary"
            className="!px-3 !py-1 text-[10px] sm:!px-4 sm:!py-1.5 sm:text-[11px]"
            onClick={handleBatchSend}
            disabled={batchSending}
          >
            {batchSending ? '…' : 'Enviar email'}
          </Button>
          <button
            onClick={handleDeleteSelected}
            className="text-xs text-red-500 hover:text-red-700 transition-colors"
          >
            Eliminar
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="text-xs text-neutral-400 hover:text-neutral-600 transition-colors"
          >
            Cancelar
          </button>
        </div>
      )}

      {/* Tabla */}
      {data.customers.length === 0 ? (
        <Card className="p-6">
          <div className="flex flex-col items-center gap-3 py-8">
            <svg
              className="w-10 h-10 text-neutral-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M8 15c0 0 1.5-2 4-2s4 2 4 2" />
              <line x1="9" y1="9" x2="9.01" y2="9" />
              <line x1="15" y1="9" x2="15.01" y2="9" />
            </svg>
            <p className="text-sm text-neutral-400 text-center">
              {data.total === 0
                ? 'Comparte el código QR del negocio para empezar.'
                : 'No hay clientes con este criterio.'}
            </p>
          </div>
        </Card>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800">
                  <th className="pb-3 pr-2 w-8">
                    <input
                      type="checkbox"
                      onChange={toggleAll}
                      checked={allSelected}
                      aria-label="Seleccionar todos"
                      className="w-4 h-4 accent-neutral-950"
                    />
                  </th>
                  <th className="text-left font-medium text-neutral-500 pb-3 pr-4 whitespace-nowrap">
                    Cliente
                  </th>
                  <th className="text-left font-medium text-neutral-500 pb-3 pr-4 whitespace-nowrap hidden sm:table-cell">
                    Teléfono
                  </th>
                  <th className="text-left font-medium text-neutral-500 pb-3 pr-4 whitespace-nowrap hidden md:table-cell">
                    Email
                  </th>
                  <th className="text-left font-medium text-neutral-500 pb-3 pr-4 whitespace-nowrap">
                    Estado
                  </th>
                  <th className="text-left font-medium text-neutral-500 pb-3 pr-4 whitespace-nowrap">
                    Puntos
                  </th>
                  <th className="text-left font-medium text-neutral-500 pb-3 whitespace-nowrap pl-2">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.customers.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-neutral-100 dark:border-neutral-800 last:border-0 hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors"
                  >
                    <td className="py-3 pr-2">
                      <input
                        type="checkbox"
                        checked={selected.has(c.id)}
                        onChange={() => toggleSelect(c.id)}
                        aria-label={`Seleccionar a ${c.name ?? c.email}`}
                        className="w-4 h-4 accent-neutral-950"
                      />
                    </td>
                    <td className="py-3 pr-4">
                      <span className="font-medium">{c.name ?? '—'}</span>
                    </td>
                    <td className="py-3 pr-4 text-neutral-500 hidden sm:table-cell">
                      {c.phone}
                    </td>
                    <td className="py-3 pr-4 text-neutral-500 hidden md:table-cell">
                      {c.email}
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded-full ${
                          c.status === 'completed' &&
                          c.rating != null &&
                          c.rating < 4
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            : statusColor[c.status] ?? 'bg-neutral-100 text-neutral-500'
                        }`}
                      >
                        {statusLabel[c.status] ?? c.status}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="font-medium">{c.points}</span>
                    </td>
                    <td className="py-3 pl-2">
                      <ActionMenu
                        customer={c}
                        isOpen={dropdownId === c.id}
                        onToggle={() =>
                          setDropdownId(dropdownId === c.id ? null : c.id)
                        }
                        onClose={() => setDropdownId(null)}
                        onAddPoint={handleAddPoint}
                        onSubtractPoint={handleSubtractPoint}
                        onSendEmail={handleSend}
                        onWhatsApp={(phone) => {
                          const cleanPhone = phone.replace(/[\s\-()\+]/g, '');
                          window.open(
                            `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
                              `Hola ${c.name ?? ''}, ¿cómo valorarías tu experiencia en ${businessName}?`,
                            )}`,
                            '_blank',
                          );
                          setDropdownId(null);
                        }}
                        onDelete={handleDelete}
                        onDetail={() => {
                          setDropdownId(null);
                          onShowDetail(c);
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          <div className="flex items-center justify-between gap-3 text-xs text-neutral-500">
            <span>
              {rangeStart}–{rangeEnd} de {data.total}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                className="!px-3 !py-1 text-[11px]"
                disabled={data.page <= 1}
                onClick={() => setData((p) => ({ ...p, page: p.page - 1 }))}
              >
                Anterior
              </Button>
              <span>
                {data.page} / {data.totalPages}
              </span>
              <Button
                variant="secondary"
                className="!px-3 !py-1 text-[11px]"
                disabled={data.page >= data.totalPages}
                onClick={() => setData((p) => ({ ...p, page: p.page + 1 }))}
              >
                Siguiente
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CustomersTable;
