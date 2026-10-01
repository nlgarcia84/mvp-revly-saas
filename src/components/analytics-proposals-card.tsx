'use client';

import { useCallback, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { regenerateAnalyticsProposals } from '@/actions/review-analytics';

// Card independiente de propuestas de mejora. Se genera con IA bajo demanda
// (reutiliza el análisis ya persistido, así que solo hace una llamada a Groq)
// y muestra un spinner mientras tanto.
const AnalyticsProposalsCard = ({
  businessId,
  initialProposals,
}: {
  businessId: string;
  initialProposals: string[];
}) => {
  const [proposals, setProposals] = useState<string[]>(initialProposals);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generate = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await regenerateAnalyticsProposals(businessId);
      setProposals(result.proposals);
      if (result.usedFallback) {
        setError(
          'La IA no respondió, así que se muestran propuestas del análisis automático.',
        );
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'No se pudieron generar las propuestas',
      );
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  return (
    <div className="border border-violet-200 dark:border-violet-900/50 bg-violet-50/40 dark:bg-violet-950/20 rounded-lg p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-violet-600 dark:text-violet-400" />
          <p className="text-[10px] font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wider">
            Propuestas de mejora
          </p>
        </div>
        <button
          type="button"
          onClick={generate}
          disabled={loading}
          className="text-xs font-medium px-3 py-1.5 rounded-md border border-violet-200 dark:border-violet-800 bg-white dark:bg-neutral-900 text-violet-700 dark:text-violet-300 hover:border-violet-400 transition-colors disabled:cursor-not-allowed disabled:opacity-60 inline-flex items-center gap-1.5 shrink-0"
        >
          {loading ? (
            <>
              <span className="w-3 h-3 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
              Generando
            </>
          ) : (
            'Generar con IA'
          )}
        </button>
      </div>

      {error && (
        <p className="text-xs text-amber-600 dark:text-amber-400">{error}</p>
      )}

      {loading ? (
        <div className="flex flex-col gap-2.5" aria-live="polite">
          <span className="sr-only">Generando propuestas con IA</span>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-4 rounded bg-violet-200/50 dark:bg-violet-900/30 animate-pulse"
              style={{ width: `${100 - i * 18}%` }}
            />
          ))}
          <p className="text-xs text-neutral-400">
            Analizando tu reputación para encontrar acciones concretas...
          </p>
        </div>
      ) : proposals.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {proposals.map((p) => (
            <li
              key={p}
              className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed flex gap-2"
            >
              <span className="text-violet-500 shrink-0">•</span>
              <span>{p}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-neutral-400">
          No hay propuestas todavía. Pulsa «Generar con IA» para obtener
          recomendaciones.
        </p>
      )}
    </div>
  );
};

export default AnalyticsProposalsCard;
