'use client';

// ─── Menú de acciones de una fila ─────────────────────
// Desplegable con las acciones disponibles para un cliente:
// ver detalle, sumar/restar puntos, enviar email o WhatsApp,
// y eliminar. El menú se cierra al hacer clic fuera.
// ────────────────────────────────────────────────────

import { useEffect, useRef } from 'react';
import type { CustomerRow } from '@/actions/customers';

const ActionMenu = ({
  customer,
  isOpen,
  onToggle,
  onClose,
  onAddPoint,
  onSubtractPoint,
  onSendEmail,
  onWhatsApp,
  onDelete,
  onDetail,
}: {
  customer: CustomerRow;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  onAddPoint: (id: string) => void;
  onSubtractPoint: (id: string) => void;
  onSendEmail: (id: string) => void;
  onWhatsApp: (phone: string) => void;
  onDelete: (id: string) => void;
  onDetail: (customer: CustomerRow) => void;
}) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, onClose]);

  const itemClass =
    'block w-full text-left px-4 py-2 text-xs text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors';

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className="text-[10px] sm:text-[11px] font-medium px-2 py-1 rounded-md border border-neutral-200 dark:border-neutral-700 text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
        aria-label="Acciones"
      >
        ⋮
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={onClose} />
          <div className="absolute right-0 z-20 mt-1 w-48 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-lg py-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDetail(customer);
                onClose();
              }}
              className={itemClass}
            >
              Ver detalle
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddPoint(customer.id);
                onClose();
              }}
              className={itemClass}
            >
              +1 punto
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSubtractPoint(customer.id);
                onClose();
              }}
              disabled={customer.points === 0}
              className={`${itemClass} text-neutral-500 disabled:opacity-40 cursor-not-allowed`}
            >
              -1 punto
            </button>
            {customer.status !== 'completed' && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSendEmail(customer.id);
                    onClose();
                  }}
                  className={itemClass}
                >
                  Enviar email
                </button>
                {customer.phone && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onWhatsApp(customer.phone);
                      onClose();
                    }}
                    className={itemClass}
                  >
                    Enviar WhatsApp
                  </button>
                )}
              </>
            )}
            {customer.status === 'completed' && (
              <div className="px-4 py-2 text-[11px] text-emerald-600">
                Reseña completada
              </div>
            )}
            <hr className="my-1 border-neutral-200 dark:border-neutral-700" />
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(customer.id);
                onClose();
              }}
              className="block w-full text-left px-4 py-2 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
            >
              Eliminar
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default ActionMenu;
