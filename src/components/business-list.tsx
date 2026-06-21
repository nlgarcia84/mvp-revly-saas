'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { deleteBusiness } from '@/actions/business';
import { nCard } from '@/components/ui/card';

type Business = {
  id: string;
  name: string;
  _count: { customers: number };
};

const BusinessList = ({ businesses: initial }: { businesses: Business[] }) => {
  const router = useRouter();
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
        <p className="text-sm text-neutral-400 text-center py-12">Crea tu primer negocio para empezar a recibir reseñas</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider">
          Tus negocios
        </h2>
        <p className="text-xs text-neutral-400 mt-1.5">
          {businesses.length} negocio{businesses.length !== 1 ? 's' : ''} registrado{businesses.length !== 1 ? 's' : ''}
        </p>
      </div>
      {businesses.map((b) => (
        <div key={b.id} className={`${nCard} flex items-center justify-between px-5 sm:px-6 py-4 sm:py-5 transition-all duration-200 hover:shadow-[-5px_-5px_10px_#ffffff,5px_5px_10px_#b0b0b0] dark:hover:shadow-[-5px_-5px_10px_#3a3a3a,5px_5px_10px_#0a0a0a] hover:scale-[1.01]`}>
          <Link href={`/business/${b.id}`} className="flex items-center gap-3 flex-1 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-neutral-950 dark:bg-neutral-100 shrink-0" />
            <span className="font-medium bg-gradient-to-r from-neutral-950 to-neutral-500 dark:from-neutral-100 dark:to-neutral-400 bg-clip-text text-transparent truncate">{b.name}</span>
            <span className="text-xs text-neutral-400 shrink-0">· {b._count.customers} cliente{b._count.customers !== 1 ? 's' : ''}</span>
          </Link>
          <div className="flex items-center gap-2 shrink-0 ml-3">
            <button
              onClick={() => handleDelete(b.id, b.name)}
              disabled={deletingId === b.id}
              className="text-[11px] text-neutral-400 hover:text-red-500 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {deletingId === b.id ? '...' : 'Eliminar'}
            </button>
            <svg className="w-4 h-4 text-neutral-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </div>
        </div>
      ))}
    </div>
  );
};

export default BusinessList;
