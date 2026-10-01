'use client';

// ─── Contexto del negocio ────────────────────────────
// El layout de /business/[id] carga el negocio y las features del
// plan una sola vez y las comparte con todas las secciones hijas.
// Así cada pantalla no repite getBusinessForDashboard() ni
// getUserFeatures(), y todas ven el mismo estado recargado.
// ────────────────────────────────────────────────────

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { getBusinessForDashboard } from '@/actions/business';
import { getUserFeatures } from '@/actions/business';

export type DashboardBusiness = Awaited<
  ReturnType<typeof getBusinessForDashboard>
>;

type BusinessContextValue = {
  id: string;
  business: DashboardBusiness;
  features: string[];
  loading: boolean;
  reload: () => Promise<void>;
};

const BusinessContext = createContext<BusinessContextValue | null>(null);

export const BusinessProvider = ({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) => {
  const [business, setBusiness] = useState<DashboardBusiness>(null);
  const [features, setFeatures] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const [b, f] = await Promise.all([
      getBusinessForDashboard(id),
      getUserFeatures(),
    ]);
    setBusiness(b);
    setFeatures(f);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    reload();
  }, [reload]);

  const value = useMemo(
    () => ({ id, business, features, loading, reload }),
    [id, business, features, loading, reload],
  );

  return (
    <BusinessContext.Provider value={value}>
      {children}
    </BusinessContext.Provider>
  );
};

export const useBusiness = () => {
  const ctx = useContext(BusinessContext);
  if (!ctx) {
    throw new Error('useBusiness debe usarse dentro de <BusinessProvider>');
  }
  return ctx;
};
