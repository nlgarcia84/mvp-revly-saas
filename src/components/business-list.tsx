'use client';

import { useState } from 'react';
import Link from 'next/link';
import { deleteBusiness } from '@/actions/business';
import { nCard } from '@/components/ui/card';

type Business = {
  id: string;
  name: string;
  _count: { customers: number };
};

const BusinessList = ({ businesses: initial }: { businesses: Business[] }) => {
  const [businesses, setBusinesses] = useState(initial);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`¿Eliminar "${name}"? Todos sus clientes se borrarán permanentemente.`)) return;
    setDeletingId(id);
    try {
      await deleteBusiness(id);
      setBusinesses((prev) => prev.filter((b) => b.id !== id));
    } catch (err: any) {
      alert(err.message);
    }
    setDeletingId(null);
  };

  if (businesses.length === 0) {
    return (
      <div className={`${nCard} p-6 sm:p-8`}>
        <div className="flex flex-col items-center justify-center gap-3 py-10 text-center sm:py-12">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-200 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400" aria-hidden="true">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 21h18M3 7v14h18V7M3 7l9-5 9 5" />
            </svg>
          </span>
          <p className="max-w-sm text-sm text-neutral-500">Crea tu primer negocio para empezar a recibir reseñas</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-4 px-1">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
            Tus negocios
          </h2>
          <p className="mt-1.5 text-xs text-neutral-400">
            {businesses.length} negocio{businesses.length !== 1 ? 's' : ''} registrado{businesses.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>
      {businesses.map((b) => (
        <div key={b.id} className={`${nCard} group flex items-center justify-between gap-3 px-4 py-4`}>
          <Link href={`/business/${b.id}`} className="flex min-w-0 flex-1 items-center gap-3 rounded-lg py-1 outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 sm:px-1">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-neutral-950 dark:bg-neutral-100" aria-hidden="true" />
            <span className="min-w-0 truncate font-medium text-neutral-900 dark:text-neutral-100">{b.name}</span>
            <span className="shrink-0 text-[11px] text-neutral-400 sm:text-xs">· {b._count.customers} cliente{b._count.customers !== 1 ? 's' : ''}</span>
          </Link>
          <div className="flex items-center gap-2 shrink-0 ml-3">
            <button
              type="button"
              onClick={() => handleDelete(b.id, b.name)}
              disabled={deletingId === b.id}
              aria-label={`Eliminar ${b.name}`}
              className="rounded-md px-2 py-1 text-[11px] text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-500 focus-visible:ring-2 focus-visible:ring-neutral-500 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-red-950/30"
            >
              {deletingId === b.id ? '...' : 'Eliminar'}
            </button>
            <svg className="h-4 w-4 text-neutral-300 transition-transform group-hover:translate-x-0.5 dark:text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </div>
        </div>
      ))}
    </div>
  );
};

export default BusinessList;
