'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  getFacebookConnectionStatus,
  publishToFacebookPage,
} from '@/actions/facebook';
import { nCard } from '@/components/ui/card';

const FbLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047v-2.66c0-3.021 1.792-4.688 4.532-4.688 1.313 0 2.686.235 2.686.235v2.971H15.83c-1.491 0-1.956.93-1.956 1.886v2.256h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
  </svg>
);

const FacebookPublisher = ({ businessId }: { businessId: string }) => {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [message, setMessage] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(
    null,
  );

  const load = useCallback(async () => {
    try {
      const status = await getFacebookConnectionStatus(businessId);
      setConnected(status.connected);
    } catch {
      setConnected(false);
    }
  }, [businessId]);

  useEffect(() => {
    load();
  }, [load]);

  if (connected === null) return null;
  // Si la página no está conectada, este componente no
  // se muestra: la propia bandeja ya informa del estado.
  if (!connected) return null;

  const handlePublish = async () => {
    if (!message.trim() && !imageUrl.trim()) return;
    setPublishing(true);
    setResult(null);
    try {
      await publishToFacebookPage(
        businessId,
        message.trim(),
        imageUrl.trim() || undefined,
      );
      setResult({ ok: true, msg: 'Publicación creada en tu página de Facebook' });
      setMessage('');
      setImageUrl('');
    } catch (e) {
      setResult({
        ok: false,
        msg: e instanceof Error ? e.message : 'Error al publicar',
      });
    }
    setPublishing(false);
  };

  return (
    <div className={`${nCard} p-5 sm:p-6 flex flex-col gap-4`}>
      <div className="flex items-center gap-2">
        <FbLogo className="w-5 h-5 text-blue-600" />
        <div>
          <h2 className="text-sm font-semibold text-blue-600 uppercase tracking-wider">
            Publicar en Facebook
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Crea una publicación directamente en tu página de Facebook.
          </p>
        </div>
      </div>

      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Escribe el contenido de la publicación..."
        rows={4}
        className="w-full px-3 py-2.5 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm bg-white dark:bg-neutral-800 text-neutral-950 dark:text-neutral-100 outline-none focus:border-blue-500 resize-y leading-relaxed"
      />

      <input
        value={imageUrl}
        onChange={(e) => setImageUrl(e.target.value)}
        placeholder="URL de una imagen (opcional)"
        className="w-full px-3 py-2.5 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm bg-white dark:bg-neutral-800 text-neutral-950 dark:text-neutral-100 outline-none focus:border-blue-500"
      />

      {result && (
        <p
          className={`text-xs ${result.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}
        >
          {result.msg}
        </p>
      )}

      <div className="flex justify-end">
        <button
          onClick={handlePublish}
          disabled={publishing || (!message.trim() && !imageUrl.trim())}
          className="text-xs font-medium px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-opacity disabled:opacity-50 cursor-pointer"
        >
          {publishing ? 'Publicando...' : 'Publicar ahora'}
        </button>
      </div>
    </div>
  );
};

export default FacebookPublisher;