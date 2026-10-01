'use client';

import type { GlobalAnalytics } from '@/lib/review-analysis';

type Aspect = { text: string; count: number };

// Resumen ejecutivo del análisis: cuál es la fortaleza que más se repite,
// cuál es el problema más mencionado y cómo está repartido el sentimiento.
// Es determinista (no llama a la IA): solo resume lo ya calculado en
// computeGlobalAnalytics, para que cargue al instante.
const AnalyticsSummary = ({ global }: { global: GlobalAnalytics }) => {
  const { total, strengths, recurringProblems, sentimentDistribution } = global;

  const topStrength = strengths[0] as Aspect | undefined;
  const topProblem = recurringProblems[0] as Aspect | undefined;

  const share = (count: number) =>
    total > 0 ? Math.min(100, Math.round((count / total) * 100)) : 0;

  const { positive, negative } = sentimentDistribution;
  const positivePct = share(positive);
  const negativePct = share(negative);
  // El neutro se calcula como complemento: redondeando los tres por separado
  // la suma puede dar 101% y la barra se descuadra.
  const neutralPct = Math.max(0, 100 - positivePct - negativePct);

  const balance =
    positive === 0 && negative === 0
      ? 'aún no hay suficiente volumen para equilibrar el diagnóstico'
      : positive >= negative * 2
        ? 'la percepción es netamente favorable'
        : negative >= positive * 2
          ? 'hay más que corregir por encima de lo que aporta'
          : 'hay equilibrio entre lo bueno y lo mejorable';

  return (
    <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg p-5 flex flex-col gap-4">
      <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
        Resumen
      </p>

      {/* Reparto de sentimiento */}
      <div>
        <div className="flex items-baseline justify-between mb-2">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            De {total} {total === 1 ? 'reseña' : 'reseñas'}
          </p>
          <p className="text-xs text-neutral-400">{balance}</p>
        </div>
        <div className="h-2 rounded-full overflow-hidden flex bg-neutral-100 dark:bg-neutral-800">
          {total === 0 && (
            <p className="sr-only">Sin reseñas analizadas todavía</p>
          )}
          <div
            className="h-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${positivePct}%` }}
          />
          <div
            className="h-full bg-stone-400 transition-all duration-500"
            style={{ width: `${neutralPct}%` }}
          />
          <div
            className="h-full bg-red-500 transition-all duration-500"
            style={{ width: `${negativePct}%` }}
          />
        </div>
        <div className="flex items-center gap-4 mt-2">
          <span className="text-xs text-neutral-500">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-1.5 align-middle" />
            {positivePct}% positivas
          </span>
          <span className="text-xs text-neutral-500">
            <span className="inline-block w-2 h-2 rounded-full bg-stone-400 mr-1.5 align-middle" />
            {neutralPct}% neutras
          </span>
          <span className="text-xs text-neutral-500">
            <span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-1.5 align-middle" />
            {negativePct}% negativas
          </span>
        </div>
      </div>

      {/* Lo más destacado de cada lado */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1.5">
            Lo que más se repite a tu favor
          </p>
          {topStrength ? (
            <>
              <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
                {topStrength.text}
              </p>
              <p className="text-xs text-neutral-400 mt-1">
                Mencionado en {topStrength.count}{' '}
                {topStrength.count === 1 ? 'reseña' : 'reseñas'} (
                {share(topStrength.count)}%)
              </p>
            </>
          ) : (
            <p className="text-xs text-neutral-400">
              Sin fortalezas detectadas todavía.
            </p>
          )}
        </div>

        <div>
          <p className="text-[10px] font-semibold text-red-500 uppercase tracking-wider mb-1.5">
            Lo que más se repite en tu contra
          </p>
          {topProblem ? (
            <>
              <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
                {topProblem.text}
              </p>
              <p className="text-xs text-neutral-400 mt-1">
                Mencionado en {topProblem.count}{' '}
                {topProblem.count === 1 ? 'reseña' : 'reseñas'} (
                {share(topProblem.count)}%)
              </p>
            </>
          ) : (
            <p className="text-xs text-neutral-400">
              No se detectaron problemas repetidos.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsSummary;
