'use client';

// ─── Ficha de un cliente ─────────────────────────────
// Modal con el detalle completo de un cliente: datos de contacto,
// estado, puntos, historial de invitaciones, valoración y feedback.
// ────────────────────────────────────────────────────

import type { CustomerRow } from '@/actions/customers';

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

const Row = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div className="flex justify-between gap-4">
    <dt className="text-neutral-500 shrink-0">{label}</dt>
    <dd className="text-right break-all">{children}</dd>
  </div>
);

const CustomerDetail = ({
  customer,
  onClose,
}: {
  customer: CustomerRow;
  onClose: () => void;
}) => (
  <>
    <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm w-full max-w-sm p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{customer.name ?? 'Cliente'}</h2>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-950 dark:hover:text-neutral-100"
            aria-label="Cerrar"
          >
            &times;
          </button>
        </div>
        <dl className="flex flex-col gap-3 text-sm">
          <Row label="Email">{customer.email}</Row>
          <Row label="Teléfono">{customer.phone}</Row>
          <Row label="Registrado">
            {new Date(customer.createdAt).toLocaleDateString('es-ES')}
          </Row>
          <Row label="Estado">
            <span
              className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded-full ${
                statusColor[customer.status] ??
                'bg-neutral-100 text-neutral-500'
              }`}
            >
              {statusLabel[customer.status] ?? customer.status}
            </span>
          </Row>
          <Row label="Puntos">
            <span className="font-medium">{customer.points}</span>
          </Row>
          {customer.invitedCount > 0 && (
            <Row label="Invitaciones enviadas">{customer.invitedCount}</Row>
          )}
          {customer.lastInvitedAt && (
            <Row label="Último envío">
              {new Date(customer.lastInvitedAt).toLocaleDateString('es-ES')}
            </Row>
          )}
          {customer.rating != null && (
            <Row label="Valoración">
              <span className="flex items-center gap-1">
                <span
                  style={{
                    color: customer.rating < 4 ? '#ef4444' : '#f59e0b',
                  }}
                >
                  {'★'.repeat(customer.rating)}
                </span>
                <span className="text-neutral-400">
                  {'☆'.repeat(5 - customer.rating)}
                </span>
              </span>
            </Row>
          )}
          {customer.feedback && (
            <div className="flex flex-col gap-1 pt-2 border-t border-neutral-100 dark:border-neutral-800 mt-2">
              <dt className="text-neutral-500 text-xs">Feedback</dt>
              <dd className="text-sm text-neutral-950 dark:text-neutral-100 leading-relaxed">
                {customer.feedback}
              </dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  </>
);

export default CustomerDetail;
