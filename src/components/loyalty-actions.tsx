'use client';

// ─── Acciones de caja ────────────────────────────────
// Las dos operaciones que se hacen en el mostrador: identificar al
// cliente con su QR y canjear su código de descuento. Van juntas
// porque son el mismo flujo de caja, pero en tarjetas separadas
// para que cada una tenga su propio espacio y su propio estado.
// ────────────────────────────────────────────────────

import { useState } from 'react';
import { redeemDiscountCodeInDashboard } from '@/actions/redeem';
import ScanCustomer from '@/components/scan-customer';
import Button from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const RedeemCard = ({ businessId }: { businessId: string }) => {
  const [redeemCode, setRedeemCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [redeemError, setRedeemError] = useState('');
  const [redeemResult, setRedeemResult] = useState<{
    customerName: string;
    newCode: string;
    remainingPoints: number;
  } | null>(null);

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    setRedeeming(true);
    setRedeemError('');
    setRedeemResult(null);
    const result = await redeemDiscountCodeInDashboard(businessId, redeemCode);
    if (!result.success) {
      setRedeemError(result.error);
    } else {
      setRedeemResult(result);
      setRedeemCode('');
    }
    setRedeeming(false);
  };

  return (
    <Card className="p-5 sm:p-6 flex flex-col gap-3">
      <div>
        <h3 className="text-sm font-semibold">Canjear descuento en caja</h3>
        <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
          Pide al cliente su código (formato <strong>REVLY-XXXX</strong>),
          escríbelo aquí y pulsa <strong>Canjear</strong>. Se descontarán 5
          puntos y se generará un código nuevo.
        </p>
      </div>

      <form
        onSubmit={handleRedeem}
        className="flex flex-col sm:flex-row gap-2"
      >
        <input
          value={redeemCode}
          onChange={(e) => setRedeemCode(e.target.value)}
          placeholder="REVLY-XXXX"
          required
          aria-label="Código de descuento del cliente"
          className="w-full sm:w-64 px-3 py-2.5 border border-neutral-200 dark:border-neutral-700 rounded-md text-sm bg-white dark:bg-neutral-800 text-neutral-950 dark:text-neutral-100 outline-none focus:border-neutral-950 dark:focus:border-neutral-400 font-mono tracking-wider uppercase"
        />
        <Button type="submit" variant="primary" disabled={redeeming}>
          {redeeming ? 'Canjeando…' : 'Canjear'}
        </Button>
      </form>

      {redeemError && <p className="text-sm text-red-500">{redeemError}</p>}

      {redeemResult && (
        <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 rounded-lg p-4">
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
            Descuento canjeado a {redeemResult.customerName}
          </p>
          <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-2">
            1. Aplica el <strong>10% de descuento</strong> en el TPV.
          </p>
          <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-1">
            2. Le quedan{' '}
            <strong>{redeemResult.remainingPoints}</strong> punto(s).
          </p>
          <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-1">
            3. Su nuevo código:{' '}
            <strong className="font-mono">{redeemResult.newCode}</strong>
          </p>
        </div>
      )}
    </Card>
  );
};

const LoyaltyActions = ({ businessId }: { businessId: string }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <Card className="p-5 sm:p-6 flex flex-col gap-3">
      <div>
        <h3 className="text-sm font-semibold">Escanear cliente</h3>
        <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
          Escanea el QR personal del cliente para identificarlo y sumarle un
          punto o canjear su recompensa.
        </p>
      </div>
      <ScanCustomer businessId={businessId} />
    </Card>
    <RedeemCard businessId={businessId} />
  </div>
);

export default LoyaltyActions;
