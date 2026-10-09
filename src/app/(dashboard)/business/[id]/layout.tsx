'use client';

// ─── Layout de /business/[id] ────────────────────────
// Cabecera con la identidad del negocio + sub-navegación entre
// secciones. Vive en el layout (no en cada página) para que:
//   • El negocio y las features se carguen una sola vez.
//   • La sub-nav permanezca fija al hacer scroll.
//   • Cambiar de sección no recargue el negocio ni pierda el
//     contexto visual.
// ────────────────────────────────────────────────────

import Image from 'next/image';
import Link from 'next/link';
import { use } from 'react';
import BusinessQR from '@/components/business-qr';
import BusinessSubnav from '@/components/business-subnav';
import { BusinessProvider, useBusiness } from '@/components/business-context';

const BusinessHeader = () => {
  const { business } = useBusiness();
  const customerCount = business?._count?.customers ?? 0;

  return (
    <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        {business?.image ? (
          <div className="w-11 h-11 rounded-xl overflow-hidden shrink-0">
            <Image
              src={business.image}
              alt={business.name}
              width={44}
              height={44}
              className="object-cover w-full h-full"
            />
          </div>
        ) : (
          <div className="w-11 h-11 rounded-xl bg-neutral-200 dark:bg-neutral-800 shrink-0" />
        )}
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-semibold truncate">
            {business?.name ?? 'Cargando…'}
          </h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            {customerCount} cliente{customerCount !== 1 ? 's' : ''} registrado
            {customerCount !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {business?.slug && (
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href={`/${business.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium px-3 py-1.5 rounded-md border border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-colors"
          >
            Ver página pública
          </Link>
          <BusinessQR slug={business.slug} />
        </div>
      )}
    </header>
  );
};

const BusinessLayout = ({
  params,
  children,
}: {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
}) => {
  const { id } = use(params);

  return (
    <BusinessProvider id={id}>
      <div className="flex min-w-0 flex-col gap-7">
        <BusinessHeader />
        <BusinessSubnav businessId={id} />
        {children}
      </div>
    </BusinessProvider>
  );
};

export default BusinessLayout;
