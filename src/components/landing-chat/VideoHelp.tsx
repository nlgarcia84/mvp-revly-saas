'use client';

// Reproductor de vídeo de ayuda. El vídeo NO se carga al abrir la landing:
// primero se muestra un botón y solo al pulsarlo se monta el elemento <video>
// con preload="none", evitando cualquier precarga innecesaria.
// Si no hay vídeo disponible, el componente no renderiza nada (solo texto).

import { useState } from 'react';
import { PlayCircle } from 'lucide-react';

type VideoHelpProps = {
  videoUrl?: string | null;
  title?: string;
};

const VideoHelp = ({ videoUrl, title }: VideoHelpProps) => {
  const [show, setShow] = useState(false);

  if (!videoUrl) return null;

  if (!show) {
    return (
      <div className="mt-3">
        <button
          type="button"
          onClick={() => setShow(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-stone-200 px-3 py-2 text-xs font-medium text-stone-700 transition-colors hover:border-neutral-950 hover:bg-stone-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:border-neutral-500 dark:hover:bg-neutral-700"
          aria-label={title ? `Ver vídeo: ${title}` : 'Ver explicación en vídeo'}
        >
          <PlayCircle className="h-4 w-4" aria-hidden="true" />
          Ver explicación en vídeo
        </button>
      </div>
    );
  }

  return (
    <figure className="mt-3">
      <video
        controls
        playsInline
        preload="none"
        className="w-full rounded-xl bg-black"
        aria-label={title ? `Vídeo: ${title}` : 'Vídeo de ayuda'}
      >
        <source src={videoUrl} type="video/mp4" />
        Tu navegador no soporta la reproducción de vídeo.
      </video>
    </figure>
  );
};

export default VideoHelp;
