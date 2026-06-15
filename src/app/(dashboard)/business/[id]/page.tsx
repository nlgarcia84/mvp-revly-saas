'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { getBusinesses } from '@/actions/business';
import { getCustomers, addCustomerBatch, deleteCustomer, deleteSelectedCustomers } from '@/actions/customers';
import { sendInvitation, sendBatchInvitations } from '@/actions/send';
import Button from '@/components/ui/button';

type Business = Awaited<ReturnType<typeof getBusinesses>>[number];
type Customer = Awaited<ReturnType<typeof getCustomers>>[number];

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

// ──────────────────────────────────────────────
// CustomerDetail
// ──────────────────────────────────────────────
// Modal con el historial de invitaciones del
// cliente: fecha de registro, cuántas veces se
// le ha enviado la invitación, última fecha
// de envío y estado actual.
// ──────────────────────────────────────────────

const CustomerDetail = ({ customer, onClose }: { customer: Customer; onClose: () => void }) => (
  <>
    <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{customer.name ?? 'Cliente'}</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-950 dark:hover:text-neutral-100">&times;</button>
        </div>
        <dl className="flex flex-col gap-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-neutral-500">Email</dt>
            <dd>{customer.email}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-neutral-500">Teléfono</dt>
            <dd>{customer.phone}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-neutral-500">Registrado</dt>
            <dd>{new Date(customer.createdAt).toLocaleDateString('es-ES')}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-neutral-500">Estado</dt>
            <dd>
              <span className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded-full ${statusColor[customer.status]}`}>
                {statusLabel[customer.status]}
              </span>
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-neutral-500">Invitaciones enviadas</dt>
            <dd>{(customer as any).invitedCount ?? 0}</dd>
          </div>
          {(customer as any).lastInvitedAt && (
            <div className="flex justify-between">
              <dt className="text-neutral-500">Último envío</dt>
              <dd>{new Date((customer as any).lastInvitedAt).toLocaleDateString('es-ES')}</dd>
            </div>
          )}
          {(customer as any).rating && (
            <div className="flex justify-between">
              <dt className="text-neutral-500">Valoración</dt>
              <dd className="flex items-center gap-1">
                <span style={{ color: '#f59e0b' }}>{'★'.repeat((customer as any).rating)}</span>
                <span className="text-neutral-400">{'☆'.repeat(5 - (customer as any).rating)}</span>
              </dd>
            </div>
          )}
          {(customer as any).feedback && (
            <div className="flex flex-col gap-1 pt-2 border-t border-neutral-100 dark:border-neutral-800 mt-2">
              <dt className="text-neutral-500 text-xs">Feedback</dt>
              <dd className="text-sm text-neutral-950 dark:text-neutral-100 leading-relaxed">
                {(customer as any).feedback}
              </dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  </>
);

const CustomersPage = ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = use(params);
  const [business, setBusiness] = useState<Business | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filter, setFilter] = useState('all');
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [batchSending, setBatchSending] = useState(false);
  const [detail, setDetail] = useState<Customer | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showCsv, setShowCsv] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', email: '', phone: '' });
  const [csvResult, setCsvResult] = useState('');

  const load = async () => {
    const businesses = await getBusinesses();
    const found = businesses.find((b) => b.id === id);
    setBusiness(found ?? null);
    if (found) setCustomers(await getCustomers(id));
  };

  useEffect(() => { load(); }, [id]);

  const handleSend = async (customerId: string) => {
    setSendingId(customerId);
    try {
      await sendInvitation(customerId);
      setCustomers((prev) =>
        prev.map((c) => c.id === customerId ? { ...c, status: 'invited' } : c),
      );
    } catch (e) {
      alert('Error al enviar: ' + (e instanceof Error ? e.message : 'desconocido'));
    }
    setSendingId(null);
  };

  const toggleSelect = (customerId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(customerId)) next.delete(customerId);
      else next.add(customerId);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((c) => c.id)));
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
      alert(`Enviados: ${sent} | Fallos: ${failed}. Revisa la consola para más detalles.`);
    }
  };

  const handleDelete = async (customerId: string) => {
    if (!confirm('¿Eliminar este cliente?')) return;
    try {
      await deleteCustomer(customerId);
      setCustomers((prev) => prev.filter((c) => c.id !== customerId));
    } catch (e) {
      alert('Error al eliminar: ' + (e instanceof Error ? e.message : 'desconocido'));
    }
  };

  const handleClearCompleted = () => {
    setFilter('pending');
  };

  const handleDeleteSelected = async () => {
    const ids = Array.from(selected);
    if (!confirm(`¿Eliminar ${ids.length} cliente${ids.length !== 1 ? 's' : ''} seleccionado${ids.length !== 1 ? 's' : ''}?`)) return;
    try {
      await deleteSelectedCustomers(ids);
      setCustomers((prev) => prev.filter((c) => !selected.has(c.id)));
      setSelected(new Set());
    } catch (e) {
      alert('Error al eliminar: ' + (e instanceof Error ? e.message : 'desconocido'));
    }
  };

  const handleAddManual = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addCustomerBatch(id, [{ ...addForm }]);
      setAddForm({ name: '', email: '', phone: '' });
      setShowAdd(false);
      await load();
    } catch (err) {
      alert('Error al añadir cliente: ' + (err instanceof Error ? err.message : 'desconocido'));
    }
  };

  const handleCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const lines = text.trim().split('\n');
    if (lines.length < 2) { setCsvResult('El CSV debe tener al menos 2 líneas (cabecera + datos)'); return; }

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const nameIdx = headers.indexOf('nombre') !== -1 ? headers.indexOf('nombre') : headers.indexOf('name');
    const emailIdx = headers.indexOf('email') !== -1 ? headers.indexOf('email') : headers.indexOf('correo') !== -1 ? headers.indexOf('correo') : headers.indexOf('mail');
    const phoneIdx = headers.indexOf('telefono') !== -1 ? headers.indexOf('telefono') : headers.indexOf('phone') !== -1 ? headers.indexOf('phone') : headers.indexOf('teléfono') !== -1 ? headers.indexOf('teléfono') : headers.indexOf('tlf');

    if (emailIdx === -1) { setCsvResult('El CSV debe tener una columna "email"'); return; }
    if (phoneIdx === -1) { setCsvResult('El CSV debe tener una columna "teléfono" o "phone"'); return; }

    const customers = lines.slice(1).map((line) => {
      const cols = line.split(',').map((c) => c.trim());
      return {
        name: nameIdx >= 0 ? cols[nameIdx] : '',
        email: cols[emailIdx],
        phone: cols[phoneIdx],
      };
    }).filter((c) => c.email);

    const result = await addCustomerBatch(id, customers);
    setCsvResult(`Importados ${result.created} cliente(s). ${result.errors} error(es).`);
    e.target.value = '';
    await load();
  };

  const filtered = filter === 'all'
    ? customers
    : customers.filter((c) => c.status === filter);

  const total = customers.length;
  const invited = customers.filter((c) => c.status === 'invited').length;
  const completed = customers.filter((c) => c.status === 'completed').length;

  return (
    <div className="flex flex-col gap-6">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0">
        <div>
          <button onClick={() => window.history.back()} className="text-xs text-neutral-400 hover:text-neutral-950 dark:hover:text-neutral-100 transition-colors mb-1">&larr; Volver a negocios</button>
          <h1 className="text-xl sm:text-2xl font-semibold mb-1">{business?.name ?? 'Cargando...'}</h1>
          <p className="text-xs sm:text-sm text-neutral-500">{total} cliente{total !== 1 ? 's' : ''} registrado{total !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" className="!px-3 !py-1.5 text-[11px]" onClick={() => {
            if (selected.size > 0) {
              handleDeleteSelected();
            } else {
              alert('Selecciona uno o más clientes de la tabla para eliminar');
            }
          }}>Eliminar</Button>
          <Button variant="secondary" className="!px-3 !py-1.5 text-[11px]" onClick={() => setShowAdd(true)}>+ Añadir cliente</Button>
          <Button variant="secondary" className="!px-3 !py-1.5 text-[11px]" onClick={() => setShowCsv(true)}>Importar CSV</Button>
          <Link href={`/business/${id}/settings`} className="text-xs sm:text-sm px-3 py-1.5 rounded-md border border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:border-neutral-950 dark:hover:border-neutral-100 transition-colors">
            Configuración
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 sm:p-5 shadow-sm flex flex-col gap-0.5">
          <span className="text-[11px] sm:text-xs text-neutral-500 font-medium">Registrados</span>
          <span className="text-2xl sm:text-3xl font-bold">{total}</span>
        </div>
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 sm:p-5 shadow-sm flex flex-col gap-0.5">
          <span className="text-[11px] sm:text-xs text-neutral-500 font-medium">Invitados</span>
          <span className="text-2xl sm:text-3xl font-bold">{invited}</span>
        </div>
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 sm:p-5 shadow-sm flex flex-col gap-0.5">
          <span className="text-[11px] sm:text-xs text-neutral-500 font-medium">Completados</span>
          <span className="text-2xl sm:text-3xl font-bold">{completed}</span>
        </div>
      </div>

      {/* Filtros + batch */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex gap-2">
          {['all', 'pending', 'invited', 'completed'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs sm:text-sm px-3 py-1.5 rounded-md border transition-colors ${
                filter === f
                  ? 'border-neutral-950 dark:border-neutral-100 bg-neutral-950 dark:bg-neutral-100 text-white dark:text-neutral-950'
                  : 'border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:border-neutral-950 dark:hover:border-neutral-100'
              }`}
            >
              {f === 'all' ? 'Todos' : statusLabel[f] ?? f}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {customers.filter((c) => c.status === 'completed').length > 0 && filter !== 'pending' && (
            <Button variant="secondary" className="!px-3 !py-1.5 text-[11px]" onClick={handleClearCompleted}>
              Ocultar completados
            </Button>
          )}
          {selected.size > 0 && (
            <Button variant="primary" className="!px-3 !py-1.5 text-[11px]" onClick={handleBatchSend} disabled={batchSending}>
              {batchSending ? 'Enviando...' : `Enviar a ${selected.size} cliente${selected.size !== 1 ? 's' : ''}`}
            </Button>
          )}
        </div>
      </div>

      {/* Tabla */}
      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 shadow-sm">
          <p className="text-sm text-neutral-400 text-center py-8">
            {customers.length === 0 ? 'Todavía no hay clientes registrados. Comparte el código QR del negocio.' : 'No hay clientes con este estado.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800">
                <th className="pb-3 pr-2 w-8">
                  <input type="checkbox" onChange={toggleAll} checked={selected.size === filtered.length && filtered.length > 0} className="w-4 h-4 accent-neutral-950" />
                </th>
                <th className="text-left font-medium text-neutral-500 pb-3 pr-4 whitespace-nowrap">Cliente</th>
                <th className="text-left font-medium text-neutral-500 pb-3 pr-4 whitespace-nowrap hidden sm:table-cell">Teléfono</th>
                <th className="text-left font-medium text-neutral-500 pb-3 pr-4 whitespace-nowrap hidden md:table-cell">Email</th>
                <th className="text-left font-medium text-neutral-500 pb-3 pr-4 whitespace-nowrap">Estado</th>
                <th className="text-left font-medium text-neutral-500 pb-3 pr-4 whitespace-nowrap hidden lg:table-cell">Valoración</th>
                <th className="text-left font-medium text-neutral-500 pb-3 whitespace-nowrap">Acción</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-neutral-100 dark:border-neutral-800 last:border-0">
                  <td className="py-3 pr-2">
                    <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleSelect(c.id)} className="w-4 h-4 accent-neutral-950" />
                  </td>
                  <td className="py-3 pr-4">
                    <button onClick={() => setDetail(c)} className="font-medium hover:underline text-left">{c.name ?? '—'}</button>
                  </td>
                  <td className="py-3 pr-4 text-neutral-500 hidden sm:table-cell">{c.phone}</td>
                  <td className="py-3 pr-4 text-neutral-500 hidden md:table-cell">{c.email}</td>
                  <td className="py-3 pr-4">
                    <span className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded-full ${statusColor[c.status] ?? 'bg-neutral-100 text-neutral-500'}`}>
                      {statusLabel[c.status] ?? c.status}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-neutral-500 hidden lg:table-cell">
                    {c.rating ? (
                      <span style={{ color: '#f59e0b' }}>{'★'.repeat(c.rating)}</span>
                    ) : (
                      <span className="text-neutral-300">—</span>
                    )}
                  </td>
                  <td className="py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {c.status !== 'completed' && (
                        <Button variant="primary" className="!px-3 !py-1.5 text-[11px]" onClick={() => handleSend(c.id)} disabled={sendingId === c.id}>
                          {sendingId === c.id ? '...' : c.status === 'invited' ? 'Reenviar mail' : 'Enviar mail'}
                        </Button>
                      )}
                      {c.status === 'completed' && (
                        <span className="text-xs text-emerald-500">Reseña hecha</span>
                      )}
                      {c.phone && business?.googleLink && c.status !== 'completed' && (
                        <a
                          href={`https://wa.me/${c.phone.replace(/[\s\-\(\)\+]/g, '')}?text=${encodeURIComponent(
                            `Hola ${c.name ?? ''}, ¿cómo valorarías tu experiencia en ${business.name}?`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] px-2.5 py-1.5 rounded-md font-medium bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
                          title="Enviar por WhatsApp"
                        >
                          Enviar WhatsApp
                        </a>
                      )}
                      <button onClick={() => handleDelete(c.id)} className="text-[11px] text-neutral-400 hover:text-red-500 transition-colors">Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {detail && <CustomerDetail customer={detail} onClose={() => setDetail(null)} />}

      {/* Modal: Añadir cliente manual */}
      {showAdd && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowAdd(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-lg font-semibold mb-4">Añadir cliente</h2>
              <form onSubmit={handleAddManual} className="flex flex-col gap-4">
                <input value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} placeholder="Nombre" className="w-full px-3 py-2.5 border border-neutral-200 dark:border-neutral-700 rounded-md text-sm bg-white dark:bg-neutral-800 text-neutral-950 dark:text-neutral-100 outline-none focus:border-neutral-950 dark:focus:border-neutral-400" />
                <input value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} placeholder="Email" required className="w-full px-3 py-2.5 border border-neutral-200 dark:border-neutral-700 rounded-md text-sm bg-white dark:bg-neutral-800 text-neutral-950 dark:text-neutral-100 outline-none focus:border-neutral-950 dark:focus:border-neutral-400" />
                <input value={addForm.phone} onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })} placeholder="Teléfono" required className="w-full px-3 py-2.5 border border-neutral-200 dark:border-neutral-700 rounded-md text-sm bg-white dark:bg-neutral-800 text-neutral-950 dark:text-neutral-100 outline-none focus:border-neutral-950 dark:focus:border-neutral-400" />
                <div className="flex gap-2 justify-end">
                  <Button variant="secondary" type="button" onClick={() => setShowAdd(false)}>Cancelar</Button>
                  <Button variant="primary" type="submit">Guardar</Button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      {/* Modal: Importar CSV */}
      {showCsv && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => { setShowCsv(false); setCsvResult(''); }} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-lg font-semibold mb-1">Importar CSV</h2>
              <p className="text-xs text-neutral-400 mb-4">Columnas: nombre, email, teléfono (separado por comas)</p>
              <input type="file" accept=".csv" onChange={handleCsv} className="text-sm text-neutral-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-neutral-200 dark:file:border-neutral-700 file:text-sm file:bg-white dark:file:bg-neutral-800 file:text-neutral-950 dark:file:text-neutral-100 hover:file:bg-neutral-100 dark:hover:file:bg-neutral-700 file:cursor-pointer" />
              {csvResult && <p className="text-sm text-neutral-500 mt-3">{csvResult}</p>}
              <div className="flex justify-end mt-4">
                <Button variant="secondary" type="button" onClick={() => { setShowCsv(false); setCsvResult(''); }}>Cerrar</Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CustomersPage;
