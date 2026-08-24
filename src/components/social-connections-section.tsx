"use client";

import { getBusinessProfileStatus } from "@/actions/google-reviews";
import { getFacebookConnectionStatus } from "@/actions/facebook";
import { getInstagramConnectionStatus } from "@/actions/instagram";
import { nCard } from "@/components/ui/card";
import { useCallback, useEffect, useState } from "react";

type GoogleStatus = Awaited<ReturnType<typeof getBusinessProfileStatus>>;
type FacebookStatus = Awaited<ReturnType<typeof getFacebookConnectionStatus>>;
type InstagramStatus = Awaited<ReturnType<typeof getInstagramConnectionStatus>>;

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
    <circle
      cx="12"
      cy="12"
      r="4.5"
      stroke="currentColor"
      strokeWidth="2"
    />
    <circle cx="17.5" cy="6.5" r="1.3" fill="currentColor" />
  </svg>
);

const GoogleLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

const CheckIcon = () => (
  <svg
    className="w-4 h-4 shrink-0"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const FbLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047v-2.66c0-3.021 1.792-4.688 4.532-4.688 1.313 0 2.686.235 2.686.235v2.971H15.83c-1.491 0-1.956.93-1.956 1.886v2.256h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
  </svg>
);

const SocialConnectionsSection = ({
  businessId,
  onConnected,
}: {
  businessId: string;
  onConnected?: () => void;
}) => {
  const [google, setGoogle] = useState<GoogleStatus | null>(null);
  const [facebook, setFacebook] = useState<FacebookStatus | null>(null);
  const [instagram, setInstagram] = useState<InstagramStatus | null>(null);
  const [mask, setMask] = useState(false);

  const load = useCallback(async () => {
    setMask(true);
    try {
      const [g, ig, fb] = await Promise.all([
        getBusinessProfileStatus(businessId),
        getInstagramConnectionStatus(businessId),
        getFacebookConnectionStatus(businessId),
      ]);
      setGoogle(g);
      setInstagram(ig);
      setFacebook(fb);
      if (onConnected) onConnected();
    } finally {
      setMask(false);
    }
  }, [businessId, onConnected]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-blue-600 uppercase tracking-wider flex items-center gap-2">
            Conexión con perfiles sociales y Google
          </h2>
          <p className="text-xs text-neutral-400 mt-2">
            Conecta tus perfiles para ver reseñas de Google y comentarios de
            Instagram y Facebook. Cada uno se conecta de forma independiente.
          </p>
        </div>
        <button
          onClick={load}
          disabled={mask}
          className="text-xs px-3 py-1.5 rounded-md border border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:border-neutral-950 dark:hover:border-neutral-100 transition-colors disabled:opacity-50 shrink-0 cursor-pointer"
        >
          {mask ? "Comprobando..." : "Actualizar"}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* ── Facebook ── */}
        <div className={`${nCard} p-5 sm:p-6 flex flex-col gap-4`}>
          <div className="flex items-center gap-2">
            <FbLogo className="w-5 h-5 text-blue-600" />
            <h3 className="text-sm font-semibold">Facebook</h3>
          </div>

          {facebook === null ? (
            <p className="text-xs text-neutral-400">Comprobando conexión...</p>
          ) : facebook.connected ? (
            <div className="flex flex-col gap-3">
              <div
                className={`flex items-center gap-2 text-xs px-3 py-2 rounded-md border ${
                  facebook.expired
                    ? "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                    : "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                }`}
              >
                <CheckIcon />
                {facebook.expired
                  ? "Acceso caducado — vuelve a conectar"
                  : `Conectado${facebook.pageName ? ` a ${facebook.pageName}` : ""}`}
              </div>
              <p className="text-xs text-neutral-400">
                Verás los comentarios de tus publicaciones en el dashboard,
                podrás responderlos con IA y publicar contenido en tu página.
              </p>
              <a
                href={`/api/facebook/disconnect?businessId=${businessId}`}
                className="text-xs text-red-400 hover:text-red-500 underline transition-colors w-fit cursor-pointer"
              >
                Desconectar Facebook
              </a>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-neutral-400">
                Conecta tu Página de Facebook para ver los comentarios de tus
                publicaciones, responderlos con IA y publicar contenido.
              </p>
              <a
                href={`/api/facebook/connect?businessId=${businessId}`}
                className="inline-flex items-center gap-2 text-xs font-medium px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors w-fit"
              >
                <FbLogo className="w-4 h-4" />
                Conectar con Facebook
              </a>
            </div>
          )}
        </div>

        {/* ── Instagram ── */}
        <div className={`${nCard} p-5 sm:p-6 flex flex-col gap-4`}>
          <div className="flex items-center gap-2">
            <IgLogo className="w-5 h-5 text-fuchsia-600" />
            <h3 className="text-sm font-semibold">Instagram</h3>
          </div>

          {instagram === null ? (
            <p className="text-xs text-neutral-400">
              Comprobando conexión...
            </p>
          ) : instagram.connected ? (
            <div className="flex flex-col gap-3">
              <div
                className={`flex items-center gap-2 text-xs px-3 py-2 rounded-md border ${
                  instagram.expired
                    ? "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                    : "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                }`}
              >
                <CheckIcon />
                {instagram.expired
                  ? "Acceso caducado — vuelve a conectar"
                  : `Conectado${instagram.username ? ` a @${instagram.username}` : ""}`}
              </div>
              <p className="text-xs text-neutral-400">
                Verás los comentarios de tus publicaciones en el dashboard y
                podrás responderlos con IA.
              </p>
              {!instagram.expired && instagram.expiresAt && (
                <p className="text-xs text-neutral-400">
                  El acceso expira el{" "}
                  {new Date(instagram.expiresAt).toLocaleDateString("es-ES")}
                  .
                </p>
              )}
              <a
                href={`/api/instagram/disconnect?businessId=${businessId}`}
                className="text-xs text-red-400 hover:text-red-500 underline transition-colors w-fit cursor-pointer"
              >
                Desconectar Instagram
              </a>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-neutral-400">
                Conecta tu cuenta profesional (Business o Creator) para ver y
                responder los comentarios de tus publicaciones.
              </p>
              <a
                href={`/api/instagram/connect?businessId=${businessId}`}
                className="inline-flex items-center gap-2 text-xs font-medium px-4 py-2 rounded-lg bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white hover:opacity-90 transition-opacity w-fit"
              >
                <IgLogo className="w-4 h-4" />
                Conectar con Instagram
              </a>
            </div>
          )}
        </div>

        {/* ── Google ── */}
        <div className={`${nCard} p-5 sm:p-6 flex flex-col gap-4`}>
          <div className="flex items-center gap-2">
            <GoogleLogo className="w-5 h-5 text-blue-600" />
            <h3 className="text-sm font-semibold">Google</h3>
          </div>

          {google === null ? (
            <p className="text-xs text-neutral-400">
              Comprobando conexión...
            </p>
          ) : google.connected ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 text-xs bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 px-3 py-2 rounded-md border border-emerald-200 dark:border-emerald-800">
                <CheckIcon />
                Conectado a Google Business Profile
              </div>
              <p className="text-xs text-neutral-400">
                Verás todas las reseñas de Google de tu negocio en el
                dashboard.
              </p>
              <a
                href={`/api/google-business/disconnect?businessId=${businessId}`}
                className="text-xs text-red-400 hover:text-red-500 underline transition-colors w-fit cursor-pointer"
              >
                Desconectar Google
              </a>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-neutral-400">
                Conecta tu cuenta de Google Business Profile para ver todas las
                reseñas de tu negocio. Si no lo conectas, verás las últimas 5
                reseñas con Google Places.
              </p>
              <a
                href={`/api/google-business/connect?businessId=${businessId}`}
                className="inline-flex items-center gap-2 text-xs font-medium px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors w-fit"
              >
                <GoogleLogo className="w-4 h-4" />
                Conectar con Google
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SocialConnectionsSection;