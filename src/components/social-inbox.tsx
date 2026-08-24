'use client';

import { useCallback, useEffect, useState } from 'react';
import { getInstagramConnectionStatus } from '@/actions/instagram';
import { getFacebookConnectionStatus } from '@/actions/facebook';
import { nCard } from '@/components/ui/card';
import InstagramCommentsSection from '@/components/instagram-comments-section';
import FacebookCommentsSection from '@/components/facebook-comments-section';
import FacebookPublisher from '@/components/facebook-publisher';

type Tab = 'instagram' | 'facebook';

const IgLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <rect
      x="2"
      y="2"
      width="20"
      height="20"
      rx="5"
      stroke="currentColor"
      strokeWidth="2"
    />
    <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="2" />
    <circle cx="17.5" cy="6.5" r="1.3" fill="currentColor" />
  </svg>
);

const FbLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047v-2.66c0-3.021 1.792-4.688 4.532-4.688 1.313 0 2.686.235 2.686.235v2.971H15.83c-1.491 0-1.956.93-1.956 1.886v2.256h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
  </svg>
);

const SocialInbox = ({
  businessId,
  features,
}: {
  businessId: string;
  features?: string[];
}) => {
  const [tab, setTab] = useState<Tab>('instagram');
  const [statuses, setStatuses] = useState<{
    instagram: boolean | null;
    facebook: boolean | null;
  }>({ instagram: null, facebook: null });

  const load = useCallback(async () => {
    try {
      const [ig, fb] = await Promise.all([
        getInstagramConnectionStatus(businessId),
        getFacebookConnectionStatus(businessId),
      ]);
      setStatuses({ instagram: ig.connected, facebook: fb.connected });
    } catch {
      setStatuses({ instagram: null, facebook: null });
    }
  }, [businessId]);

  useEffect(() => {
    load();
  }, [load]);

  // Si no hay ninguna conectada, mostramos las dos pestañas
  // para que el usuario vaya a Configuración. Si solo hay
  // una conectada, la abrimos por defecto.
  const connectedTabs: Tab[] = [];
  if (statuses.instagram === true) connectedTabs.push('instagram');
  if (statuses.facebook === true) connectedTabs.push('facebook');

  useEffect(() => {
    if (connectedTabs.length === 1 && connectedTabs[0] !== tab) {
      setTab(connectedTabs[0]);
    }
  }, [connectedTabs.length, connectedTabs[0], tab]);

  const tabs: { key: Tab; label: string; connected: boolean }[] = [
    {
      key: 'instagram',
      label: `Instagram${statuses.instagram === true ? '' : ' · sin conectar'}`,
      connected: statuses.instagram === true,
    },
    {
      key: 'facebook',
      label: `Facebook${statuses.facebook === true ? '' : ' · sin conectar'}`,
      connected: statuses.facebook === true,
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-sm font-semibold text-blue-600 uppercase tracking-wider">
            Bandeja de redes sociales
          </h2>
          <p className="text-xs text-neutral-400 mt-2">
            Selecciona una red para ver y responder sus comentarios.
          </p>
        </div>
      </div>

      {/* Pestañas según lo que está conectado */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map((t) => {
          const isActive = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-md border transition-colors cursor-pointer ${
                isActive
                  ? 'border-neutral-950 dark:border-neutral-100 bg-neutral-950 dark:bg-neutral-100 text-white dark:text-neutral-950'
                  : 'border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:border-neutral-950 dark:hover:border-neutral-100'
              }`}
            >
              {t.key === 'instagram' ? (
                <IgLogo className="w-4 h-4" />
              ) : (
                <FbLogo className="w-4 h-4" />
              )}
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Contenido de la red seleccionada (solo una a la vez) */}
      <div key={tab}>
        {tab === 'instagram' ? (
          <InstagramCommentsSection businessId={businessId} features={features} />
        ) : (
          <>
            <FacebookCommentsSection businessId={businessId} features={features} />
            <div className="mt-5">
              <FacebookPublisher businessId={businessId} />
            </div>
          </>
        )}
      </div>

      {/* Aviso si ninguna red está conectada todavía */}
      {statuses.instagram === false && statuses.facebook === false && (
        <div className={`${nCard} p-5 sm:p-6 flex flex-col gap-3`}>
          <p className="text-sm text-neutral-400">
            Conecta Instagram o Facebook desde Configuración para empezar a
            responder comentarios.
          </p>
          <a
            href={`/business/${businessId}/settings`}
            className="text-xs font-medium px-4 py-2 rounded-md bg-neutral-950 dark:bg-neutral-100 text-white dark:text-neutral-950 hover:opacity-80 transition-opacity w-fit"
          >
            Ir a Configuración
          </a>
        </div>
      )}
    </div>
  );
};

export default SocialInbox;