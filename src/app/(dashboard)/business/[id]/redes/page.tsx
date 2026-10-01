'use client';

// ─── Sección: Redes sociales ─────────────────────────
// Conexiones (Google Business Profile, Instagram, Facebook) arriba,
// porque es donde se usan; debajo, la bandeja de comentarios y el
// reporte de plan de acción.
// ────────────────────────────────────────────────────

import SocialConnectionsSection from '@/components/social-connections-section';
import SocialInbox from '@/components/social-inbox';
import { useBusiness } from '@/components/business-context';
import { useOAuthMessages } from '@/lib/use-oauth-messages';

const RedesPage = () => {
  const { id, features, reload } = useBusiness();
  const oauthMsg = useOAuthMessages();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold">Redes sociales</h1>
        <p className="text-xs sm:text-sm text-neutral-500 mt-1">
          Conecta tus cuentas y responde los comentarios desde un solo sitio.
        </p>
      </div>

      {oauthMsg && (
        <p
          className={`text-sm px-4 py-3 rounded-lg border ${
            oauthMsg.toLowerCase().includes('error') ||
            oauthMsg.toLowerCase().includes('no se')
              ? 'text-red-600 bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900/50 dark:text-red-400'
              : 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/50 dark:text-emerald-400'
          }`}
          role="status"
        >
          {oauthMsg}
        </p>
      )}

      <section
        aria-label="Conexiones"
        id="conexiones"
        className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm p-4 sm:p-6"
      >
        <SocialConnectionsSection businessId={id} onConnected={reload} />
      </section>

      <section
        aria-label="Bandeja de comentarios"
        className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm p-4 sm:p-6"
      >
        <SocialInbox businessId={id} features={features} />
      </section>

      {features.includes('pdf-reports') && (
        <section
          aria-label="Reporte de plan de acción"
          className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm p-4 sm:p-6"
        >
          <h2 className="text-sm font-semibold mb-1">Reporte de plan de acción</h2>
          <p className="text-xs text-neutral-400 mb-3">
            Genera un informe basado en las reseñas negativas.
          </p>
          <a
            href={`/api/report/${id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium px-4 py-2 rounded-md bg-neutral-950 dark:bg-neutral-100 text-white dark:text-neutral-950 hover:opacity-80 transition-opacity"
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Descargar reporte
          </a>
        </section>
      )}
    </div>
  );
};

export default RedesPage;
