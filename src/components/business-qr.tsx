'use client';

// ─── Componente: BusinessQR ──────────────────────────
// Muestra un botón azul "QR" que al hacer clic abre una
// ventana emergente (modal) con el código QR del negocio.
// El QR codifica la URL pública revly.es/{slug} para que
// los clientes la escaneen y accedan al formulario.
//
// También permite descargar el QR como imagen PNG.
//
// Se usa tanto en la lista de negocios como en la página
// de detalle de cada negocio.
// ─────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import QRCode from 'qrcode';

const BusinessQR = ({ slug }: { slug: string }) => {
  // url: la imagen del QR en formato base64 (se genera al cargar)
  // show: controla si el modal está abierto o cerrado
  const [url, setUrl] = useState('');
  const [show, setShow] = useState(false);

  // Al montar el componente (o si cambia el slug), genera
  // el QR llamando a la librería qrcode. El resultado es
  // una imagen en formato data URL que se guarda en "url".
  // Usamos window.location.origin para que funcione tanto
  // en local (localhost:3000) como en producción (revly.es).
  useEffect(() => {
    QRCode.toDataURL(`${window.location.origin}/${slug}`, {
      width: 320,
      margin: 2,
    })
      .then(setUrl)
      .catch((err) => console.error('Error al generar QR:', err));
  }, [slug]);

  // Crea un enlace temporal y lo "clicla" para descargar
  // la imagen del QR con el nombre qr-{slug}.png
  const handleDownload = () => {
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = `qr-${slug}.png`;
    a.click();
  };

  return (
    <>
      {/* Botón azul que abre el modal del QR */}
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShow(true); }}
        className="text-xs font-medium px-3 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors cursor-pointer"
        title="Ver y descargar código QR"
      >
        {/* Icono de código QR */}
        <svg className="w-3.5 h-3.5 inline-block -mt-0.5 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
          <path d="M18 14h3v3" /><path d="M14 18v3h3" /><path d="M14 14h3" /><path d="M18 21h3v-3" />
        </svg>
        QR
      </button>

      {/* Modal: fondo oscuro semitransparente con el QR grande */}
      {show && url && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center" onClick={() => setShow(false)}>
          <div
            className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm p-8 flex flex-col items-center gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Imagen del QR */}
            <img src={url} alt={`QR para ${slug}`} className="w-64 h-64 object-contain" />
            {/* Texto con la URL que contiene el QR */}
            <p className="text-xs text-neutral-400">revly.es/{slug}</p>
            {/* Botones de descarga y cierre */}
            <div className="flex gap-3 mt-2">
              <button
                onClick={handleDownload}
                className="text-sm font-medium px-5 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors cursor-pointer"
              >
                {/* Icono de descarga */}
                <svg className="w-4 h-4 inline-block -mt-0.5 mr-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Descargar PNG
              </button>
              <button
                onClick={() => setShow(false)}
                className="text-sm font-medium px-5 py-2.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:border-neutral-950 dark:hover:border-neutral-100 transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BusinessQR;
