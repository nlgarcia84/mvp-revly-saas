'use client';

// ─── Componente: ScanCustomer ───────────────────────
// "Escanear cliente": el empleado abre la cámara, escanea
// el QR personal del cliente y Revly identifica al cliente.
// Después puede añadir un punto o canjear la recompensa.
// Incluye un fallback manual (pegar el código) por si la
// cámara no está disponible.
//
// Toda la validación (pertenencia al negocio, límite diario,
// canje único…) ocurre en el servidor. Este componente solo
// envía identificadores; nunca confía en datos del cliente.
// ─────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { extractQrToken } from '@/lib/qr-token';
import { scanCustomerToken } from '@/actions/customers';
import { addPointByEmployee } from '@/actions/points';
import { redeemRewardByEmployee } from '@/actions/redeem';

type ScannedCustomer = {
  id: string;
  name: string | null;
  points: number;
  discountCode: string | null;
  canEarnToday: boolean;
  rewardAvailable: boolean;
  pointsPerRedemption: number;
  pointsCap: number;
  discountPercent: number;
};

const ScanCustomer = ({ businessId }: { businessId: string }) => {
  const [open, setOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [camError, setCamError] = useState('');
  const [lookupError, setLookupError] = useState('');
  const [manualToken, setManualToken] = useState('');
  const [result, setResult] = useState<ScannedCustomer | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionMsg, setActionMsg] = useState('');
  const [redeemResult, setRedeemResult] = useState<{
    newCode: string;
    remainingPoints: number;
  } | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const stopCamera = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanning(false);
  }, []);

  const handleLookup = useCallback(
    async (rawToken: string) => {
      const token = extractQrToken(rawToken);
      if (!token) {
        setLookupError('No se pudo leer el QR. Inténtalo de nuevo.');
        return;
      }
      setLookupError('');
      const res = await scanCustomerToken(token, businessId);
      if (!res.success) {
        setLookupError(res.error);
        return;
      }
      setResult(res.customer);
      setActionMsg('');
      setRedeemResult(null);
      stopCamera();
    },
    [businessId, stopCamera],
  );

  const startCamera = useCallback(async () => {
    setCamError('');
    setLookupError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setScanning(true);

      const video = videoRef.current;
      const canvas = canvasRef.current ?? document.createElement('canvas');
      canvasRef.current = canvas;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      timerRef.current = setInterval(() => {
        if (!video || !ctx || video.readyState !== video.HAVE_ENOUGH_DATA) {
          return;
        }
        const w = video.videoWidth;
        const h = video.videoHeight;
        if (!w || !h) return;

        const scale = 640 / w;
        canvas.width = 640;
        canvas.height = Math.round(h * scale);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'attemptBoth',
        });
        if (code && code.data) {
          handleLookup(code.data);
        }
      }, 400);
    } catch (err) {
      setCamError(
        'No se pudo acceder a la cámara. Pega el código del QR del cliente.',
      );
      setScanning(false);
    }
  }, [handleLookup]);

  const close = useCallback(() => {
    stopCamera();
    setOpen(false);
    setResult(null);
    setLookupError('');
    setActionMsg('');
    setRedeemResult(null);
    setManualToken('');
    setCamError('');
  }, [stopCamera]);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  const handleAddPoint = async () => {
    if (!result) return;
    setBusy(true);
    setActionMsg('');
    const res = await addPointByEmployee(result.id, businessId);
    if (res.success) {
      setResult((prev) =>
        prev
          ? {
              ...prev,
              points: res.points,
              canEarnToday: false,
              rewardAvailable: res.points >= prev.pointsPerRedemption,
            }
          : prev,
      );
      setActionMsg('¡Punto añadido! 🎉');
    } else {
      setActionMsg(res.error);
    }
    setBusy(false);
  };

  const handleRedeem = async () => {
    if (!result) return;
    setBusy(true);
    setActionMsg('');
    const res = await redeemRewardByEmployee(result.id, businessId);
    if (res.success) {
      setResult((prev) =>
        prev
          ? { ...prev, points: res.remainingPoints, rewardAvailable: false }
          : prev,
      );
      setRedeemResult({
        newCode: res.newCode,
        remainingPoints: res.remainingPoints,
      });
    } else {
      setActionMsg(res.error);
    }
    setBusy(false);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md border border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-colors cursor-pointer"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 7V5a2 2 0 0 1 2-2h2" /><path d="M17 3h2a2 2 0 0 1 2 2v2" />
          <path d="M21 17v2a2 2 0 0 1-2 2h-2" /><path d="M7 21H5a2 2 0 0 1-2-2v-2" />
          <line x1="7" y1="12" x2="17" y2="12" />
        </svg>
        Escanear cliente
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={close}>
          <div
            className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm w-full max-w-sm p-6 flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Escanear cliente</h2>
              <button onClick={close} className="text-neutral-400 hover:text-neutral-950 dark:hover:text-neutral-100">&times;</button>
            </div>

            {!result ? (
              <>
                <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-neutral-950">
                  <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
                  {!scanning && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center">
                      <button
                        onClick={startCamera}
                        className="text-sm font-medium px-5 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors cursor-pointer"
                      >
                        Activar cámara
                      </button>
                      {camError && <p className="text-xs text-white/80">{camError}</p>}
                    </div>
                  )}
                </div>

                {scanning && (
                  <button
                    onClick={stopCamera}
                    className="text-sm font-medium px-4 py-2 rounded-md border border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:border-neutral-950 dark:hover:border-neutral-100 transition-colors cursor-pointer"
                  >
                    Detener cámara
                  </button>
                )}

                <div className="border-t border-neutral-200 dark:border-neutral-800 pt-4">
                  <p className="text-xs text-neutral-400 mb-2">
                    ¿No tienes cámara? Pega aquí el código del QR del cliente.
                  </p>
                  <div className="flex gap-2">
                    <input
                      value={manualToken}
                      onChange={(e) => setManualToken(e.target.value)}
                      placeholder="Código del QR"
                      className="flex-1 min-w-0 px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-md text-sm text-neutral-950 dark:text-neutral-100 bg-white dark:bg-neutral-800 outline-none focus:border-neutral-950 dark:focus:border-neutral-400 font-mono"
                    />
                    <button
                      onClick={() => handleLookup(manualToken)}
                      disabled={!manualToken.trim()}
                      className="text-sm font-medium px-4 py-2 rounded-md bg-neutral-950 dark:bg-neutral-100 text-white dark:text-neutral-950 hover:opacity-80 disabled:opacity-40 transition-opacity cursor-pointer"
                    >
                      Buscar
                    </button>
                  </div>
                </div>

                {lookupError && (
                  <p className="text-sm text-red-500">{lookupError}</p>
                )}
              </>
            ) : (
              <>
                <div className="text-center py-2">
                  <p className="text-xs text-neutral-400 uppercase tracking-wider mb-1">Cliente</p>
                  <p className="text-xl font-semibold">{result.name ?? 'Cliente'}</p>
                </div>

                <div className="bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold">{result.points}</p>
                  <p className="text-xs text-neutral-400 mt-1">
                    {result.points} punto{result.points !== 1 ? 's' : ''} · recompensa cada {result.pointsPerRedemption} puntos
                  </p>
                </div>

                {result.rewardAvailable ? (
                  <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 rounded-lg p-4 text-center">
                    <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                      🎁 Recompensa disponible
                    </p>
                    <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-1">
                      {result.discountPercent}% de descuento
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-neutral-400 text-center">
                    Esta compra: +1 punto
                  </p>
                )}

                {actionMsg && (
                  <p className="text-sm text-center font-medium">{actionMsg}</p>
                )}

                {redeemResult && (
                  <div className="bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 rounded-lg p-3 text-center">
                    <p className="text-xs text-neutral-500">Aplica el {result.discountPercent}% en caja.</p>
                    <p className="text-xs text-neutral-500 mt-1">
                      Quedan <strong>{redeemResult.remainingPoints}</strong> punto(s). Nuevo código:
                    </p>
                    <p className="text-sm font-mono font-bold tracking-widest mt-1">{redeemResult.newCode}</p>
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <button
                    onClick={handleAddPoint}
                    disabled={busy || !result.canEarnToday}
                    className="text-sm font-medium px-4 py-2.5 rounded-md bg-neutral-950 dark:bg-neutral-100 text-white dark:text-neutral-950 hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity cursor-pointer"
                  >
                    {busy ? 'Procesando…' : result.canEarnToday ? 'Añadir punto' : 'Punto de hoy ya añadido'}
                  </button>

                  {result.rewardAvailable && (
                    <button
                      onClick={handleRedeem}
                      disabled={busy}
                      className="text-sm font-medium px-4 py-2.5 rounded-md border border-emerald-600 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 disabled:opacity-40 transition-colors cursor-pointer"
                    >
                      {busy ? 'Procesando…' : 'Canjear recompensa'}
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setResult(null);
                      setLookupError('');
                      setActionMsg('');
                      setRedeemResult(null);
                    }}
                    className="text-sm font-medium px-4 py-2 rounded-md border border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:border-neutral-950 dark:hover:border-neutral-100 transition-colors cursor-pointer"
                  >
                    Escanear otro cliente
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default ScanCustomer;
