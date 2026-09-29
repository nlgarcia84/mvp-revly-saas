'use client';

// ─── Componente: CustomerQR ─────────────────────────
// Muestra el QR personal del cliente (diferente del QR del
// negocio). Codifica únicamente el qrToken (identificador
// opaco, sin puntos ni datos). Incluye un botón "Ampliar"
// para verlo a pantalla completa y poder escanearlo desde
// otro móvil, y descarga en PNG.
// ─────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

const CustomerQR = ({ qrToken }: { qrToken: string }) => {
  const [url, setUrl] = useState('');
  const [show, setShow] = useState(false);

  useEffect(() => {
    QRCode.toDataURL(qrToken, { width: 640, margin: 2, errorCorrectionLevel: 'M' })
      .then(setUrl)
      .catch((err) => console.error('Error al generar QR:', err));
  }, [qrToken]);

  const handleDownload = () => {
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = 'qr-cliente.png';
    a.click();
  };

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm p-6 text-center">
      <h2 className="text-sm font-semibold mb-1">Tu QR de cliente</h2>
      <p className="text-xs text-neutral-400 mb-4">
        Enséñaselo al empleado para sumar puntos.
      </p>

      {url ? (
        <button
          onClick={() => setShow(true)}
          className="cursor-pointer block mx-auto focus:outline-none"
          aria-label="Ampliar QR"
        >
          <img
            src={url}
            alt="Tu QR de cliente"
            className="w-56 h-56 object-contain rounded-md border border-neutral-200 dark:border-neutral-800 p-1"
          />
        </button>
      ) : (
        <div className="w-56 h-56 mx-auto rounded-md bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
      )}

      <p className="text-xs text-neutral-400 mt-4">
        Púlsalo para ampliarlo y escanearlo fácilmente.
      </p>

      {show && url && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center gap-4 p-4"
          onClick={() => setShow(false)}
        >
          <div
            className="flex flex-col items-center gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={url}
              alt="QR de cliente ampliado"
              className="w-[80vw] max-w-sm h-auto object-contain rounded-2xl bg-white p-3"
            />
            <div className="flex gap-3">
              <button
                onClick={handleDownload}
                className="text-sm font-medium px-5 py-2.5 rounded-lg bg-white text-neutral-950 hover:bg-neutral-200 transition-colors cursor-pointer"
              >
                Descargar PNG
              </button>
              <button
                onClick={() => setShow(false)}
                className="text-sm font-medium px-5 py-2.5 rounded-lg border border-white/30 text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerQR;
