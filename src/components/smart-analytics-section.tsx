'use client';

import { useCallback, useEffect, useState } from 'react';
import { getSmartAnalytics } from '@/actions/review-analytics';
import type { ReviewCategory, SmartAnalyticsResult } from '@/actions/review-analytics';

const sentimentLabel: Record<string, string> = {
  positive: 'Positivas',
  neutral: 'Neutras',
  negative: 'Negativas',
};

const sentimentColor: Record<string, string> = {
  positive: 'bg-emerald-500',
  neutral: 'bg-stone-400',
  negative: 'bg-red-500',
};

type CategoryCount = { name: string; count: number };

type SmartAnalyticsSectionProps = {
  businessId: string;
  selectedCategory?: string | null;
  onSelectCategory?: (category: string | null) => void;
  categoryCounts?: CategoryCount[];
  onCategoriesLoaded?: (index: ReviewCategory[]) => void;
};

const SmartAnalyticsSection = ({
  businessId,
  selectedCategory = null,
  onSelectCategory,
  categoryCounts,
  onCategoriesLoaded,
}: SmartAnalyticsSectionProps) => {
  const [data, setData] = useState<SmartAnalyticsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getSmartAnalytics(businessId);
      setData(result);
      onCategoriesLoaded?.(result.reviewCategories);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al analizar las reseñas');
    }
    setLoading(false);
  }, [businessId, onCategoriesLoaded]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg p-5">
        <p className="text-sm text-neutral-400">Analizando reseñas con IA...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg p-5 flex items-center justify-between">
        <p className="text-sm text-neutral-400">{error}</p>
        <button
          onClick={load}
          className="text-xs px-3 py-1.5 rounded-md border border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:border-neutral-950 dark:hover:border-neutral-100 transition-colors"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (!data?.global) {
    return (
      <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg p-5">
        <p className="text-sm text-neutral-400">
          No hay reseñas disponibles para analizar.
        </p>
      </div>
    );
  }

  const g = data.global;
  const total = g.sentimentDistribution.positive + g.sentimentDistribution.neutral + g.sentimentDistribution.negative;
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

  const starTotal =
    g.starDistribution['1'] +
    g.starDistribution['2'] +
    g.starDistribution['3'] +
    g.starDistribution['4'] +
    g.starDistribution['5'];

  return (
    <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg p-5 flex flex-col gap-5">
      {/* Cabecera */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-violet-600 dark:text-violet-400 uppercase tracking-wider">
            Smart Analytics
          </h3>
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300">
            IA
          </span>
        </div>
        <span className="text-xs text-neutral-400">
          {g.total} de {data.totalReviews} reseñas analizadas
          {data.newlyAnalyzed > 0 ? ` · ${data.newlyAnalyzed} nuevas` : ''}
        </span>
      </div>

      {/* Sentimiento + estrellas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg p-4">
          <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-3">
            Sentimiento
          </p>
          <div className="flex flex-col gap-2.5">
            {(['positive', 'neutral', 'negative'] as const).map((key) => {
              const count = g.sentimentDistribution[key];
              return (
                <div key={key} className="flex items-center gap-2">
                  <span className="w-16 text-xs text-neutral-500">
                    {sentimentLabel[key]}
                  </span>
                  <div className="flex-1 h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${sentimentColor[key]} rounded-full transition-all duration-500`}
                      style={{ width: `${pct(count)}%` }}
                    />
                  </div>
                  <span className="w-10 text-right text-xs text-neutral-500">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg p-4">
          <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-3">
            Distribución de estrellas
          </p>
          <div className="flex flex-col gap-1.5">
            {([5, 4, 3, 2, 1] as const).map((star) => {
              const count = g.starDistribution[String(star) as '1' | '2' | '3' | '4' | '5'];
              const width = starTotal > 0 ? Math.round((count / starTotal) * 100) : 0;
              return (
                <div key={star} className="flex items-center gap-2">
                  <span className="w-6 text-xs text-neutral-500">{star}★</span>
                  <div className="flex-1 h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full transition-all duration-500"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-xs text-neutral-400">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Categorías (filtro compartido con la lista de reseñas) */}
      {(() => {
        const categories = categoryCounts !== undefined ? categoryCounts : g.topCategories;
        if (categories.length === 0) return null;
        return (
          <div>
            <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-2">
              Principales categorías
            </p>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => {
                const active = selectedCategory === c.name;
                return (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => onSelectCategory?.(active ? null : c.name)}
                    className={`text-xs px-2.5 py-1 rounded-md border transition-colors cursor-pointer ${
                      active
                        ? 'border-violet-600 bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300'
                        : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:border-violet-400'
                    }`}
                  >
                    {c.name} <span className="text-neutral-400">({c.count})</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Conclusiones y propuestas */}
      <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg p-5 flex flex-col gap-4">
        <p className="text-[10px] font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wider">
          Conclusiones y propuestas
        </p>

        {g.conclusions.general && (
          <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
            {g.conclusions.general}
          </p>
        )}

        <div>
          <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-2">
            Fortalezas
          </p>
          {g.strengths.length > 0 ? (
            <ul className="flex flex-col gap-1.5">
              {g.strengths.map((s) => (
                <li
                  key={s.text}
                  className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed"
                >
                  • {s.text}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-neutral-400">Sin datos suficientes.</p>
          )}
        </div>

        <div>
          <p className="text-[10px] font-semibold text-red-500 uppercase tracking-wider mb-2">
            Aspectos a mejorar
          </p>
          {g.recurringProblems.length > 0 ? (
            <ul className="flex flex-col gap-1.5">
              {g.recurringProblems.map((s) => (
                <li
                  key={s.text}
                  className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed"
                >
                  • {s.text}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-neutral-400">
              No se detectaron aspectos a mejorar.
            </p>
          )}
        </div>

        <div>
          <p className="text-[10px] font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wider mb-2">
            💡 Propuestas
          </p>
          {g.conclusions.proposals.length > 0 ? (
            <ul className="flex flex-col gap-1.5">
              {g.conclusions.proposals.map((p) => (
                <li
                  key={p}
                  className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed"
                >
                  • {p}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-neutral-400">
              No se detectaron problemas que requieran propuestas.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SmartAnalyticsSection;
