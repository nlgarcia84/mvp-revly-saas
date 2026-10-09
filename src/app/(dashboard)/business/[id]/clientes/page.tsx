'use client';

// ─── Sección: Clientes ────────────────────────────────
// Fidelización y base de clientes: las dos acciones de caja
// (escanear QR y canjear código) arriba, y la tabla paginada
// debajo. Cada parte tiene su propio espacio.
// ────────────────────────────────────────────────────

import { useState } from 'react';
import CustomerDetail from '@/components/customer-detail';
import { AddCustomerModal, ImportCsvModal } from '@/components/customer-modals';
import CustomersTable from '@/components/customers-table';
import LoyaltyActions from '@/components/loyalty-actions';
import { useBusiness } from '@/components/business-context';
import type { CustomerRow } from '@/actions/customers';

const ClientesPage = () => {
  const { id, business, reload } = useBusiness();
  const [detail, setDetail] = useState<CustomerRow | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showCsv, setShowCsv] = useState(false);

  return (
    <div className="flex flex-col gap-6 stagger">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold">Clientes</h1>
        <p className="text-xs sm:text-sm text-neutral-500 mt-1">
          Fidelización, puntos y base de clientes.
        </p>
      </div>

      <LoyaltyActions businessId={id} />

      <section
        aria-label="Base de clientes"
        className="dashboard-card rounded-xl p-4 sm:p-6"
      >
        <h2 className="text-sm font-semibold mb-4">Base de clientes</h2>
        <CustomersTable
          businessId={id}
          businessName={business?.name ?? ''}
          onAdd={() => setShowAdd(true)}
          onImportCsv={() => setShowCsv(true)}
          onShowDetail={setDetail}
        />
      </section>

      {detail && (
        <CustomerDetail customer={detail} onClose={() => setDetail(null)} />
      )}
      {showAdd && (
        <AddCustomerModal
          businessId={id}
          onClose={() => setShowAdd(false)}
          onSaved={reload}
        />
      )}
      {showCsv && (
        <ImportCsvModal
          businessId={id}
          onClose={() => setShowCsv(false)}
          onSaved={reload}
        />
      )}
    </div>
  );
};

export default ClientesPage;
