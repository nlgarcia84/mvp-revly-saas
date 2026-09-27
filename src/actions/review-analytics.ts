'use server';

import prisma from '@/lib/db';
import { createClient } from '@/lib/supabase/server';
import { getBusinessGoogleReviews } from '@/actions/google-reviews';
import { callGroq } from '@/actions/generate-response';
import {
  ANALYSIS_SYSTEM_PROMPT,
  buildAnalysisUserPrompt,
  computeGlobalAnalytics,
  mapWithConcurrency,
  normalizeReviews,
  parseAnalysisJson,
  type GlobalAnalytics,
  type NormalizedReview,
  type ReviewAnalysisResult,
  type ReviewSource,
} from '@/lib/review-analysis';

// Concurrencia máxima de llamadas a Groq. Evita saturar la API con
// miles de peticiones simultáneas; el resto se procesa en cola.
const CONCURRENCY = 5;

// Devuelve el id del usuario autenticado o lanza si no hay sesión.
async function requireUserId(): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');
  return user.id;
}

export type ReviewCategory = {
  externalReviewId: string;
  categories: string[];
};

export type SmartAnalyticsResult = {
  ok: boolean;
  source: ReviewSource | null;
  totalReviews: number;
  analyzedCount: number;
  newlyAnalyzed: number;
  global: GlobalAnalytics | null;
  reviewCategories: ReviewCategory[];
};

function toAnalysisResult(row: {
  sentiment: string;
  categories: unknown;
  positiveAspects: unknown;
  negativeAspects: unknown;
  summary: string;
}): ReviewAnalysisResult {
  const asStrArray = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];

  return {
    sentiment:
      row.sentiment === 'positive' ||
      row.sentiment === 'neutral' ||
      row.sentiment === 'negative'
        ? row.sentiment
        : 'neutral',
    categories: asStrArray(row.categories),
    positiveAspects: asStrArray(row.positiveAspects),
    negativeAspects: asStrArray(row.negativeAspects),
    summary: row.summary ?? '',
  };
}

// Smart Analytics: analiza con IA solo las reseñas nuevas y reutiliza las
// ya analizadas (idempotente). La fuente de verdad sigue siendo Google.
export const getSmartAnalytics = async (
  businessId: string,
): Promise<SmartAnalyticsResult> => {
  const userId = await requireUserId();

  const business = await prisma.business.findFirst({
    where: { id: businessId, userId },
    select: { id: true },
  });
  if (!business) throw new Error('Negocio no encontrado');

  const data = await getBusinessGoogleReviews(businessId);
  if (!data || !data.reviews || data.reviews.length === 0) {
    return {
      ok: true,
      source: null,
      totalReviews: 0,
      analyzedCount: 0,
      newlyAnalyzed: 0,
      global: null,
      reviewCategories: [],
    };
  }

  const source = data.source as ReviewSource;
  const reviews: NormalizedReview[] = normalizeReviews(data.reviews, source);

  // Análisis ya existentes para este negocio + fuente.
  const existing = await prisma.reviewAnalysis.findMany({
    where: { businessId, source },
    select: { externalReviewId: true },
  });
  const existingIds = new Set(existing.map((e) => e.externalReviewId));

  const toAnalyze = reviews.filter((r) => !existingIds.has(r.externalReviewId));

  let newlyAnalyzed = 0;

  if (toAnalyze.length > 0) {
    const results = await mapWithConcurrency(
      toAnalyze,
      CONCURRENCY,
      async (review): Promise<ReviewAnalysisResult | null> => {
        try {
          const raw = await callGroq(
            ANALYSIS_SYSTEM_PROMPT,
            buildAnalysisUserPrompt(review),
            700,
            0,
          );
          const parsed = parseAnalysisJson(raw);
          if (!parsed) {
            console.error(
              `[SmartAnalytics] JSON inválido para review ${review.externalReviewId}`,
            );
            return null;
          }

          await prisma.reviewAnalysis.upsert({
            where: {
              businessId_source_externalReviewId: {
                businessId,
                source,
                externalReviewId: review.externalReviewId,
              },
            },
            update: {
              sentiment: parsed.sentiment,
              categories: parsed.categories,
              positiveAspects: parsed.positiveAspects,
              negativeAspects: parsed.negativeAspects,
              summary: parsed.summary,
              updatedAt: new Date(),
            },
            create: {
              businessId,
              source,
              externalReviewId: review.externalReviewId,
              sentiment: parsed.sentiment,
              categories: parsed.categories,
              positiveAspects: parsed.positiveAspects,
              negativeAspects: parsed.negativeAspects,
              summary: parsed.summary,
            },
          });

          return parsed;
        } catch (error) {
          console.error(
            `[SmartAnalytics] Error analizando review ${review.externalReviewId}:`,
            error,
          );
          return null;
        }
      },
    );

    newlyAnalyzed = results.filter(Boolean).length;
  }

  // Recargamos TODOS los análisis (nuevos + existentes) para el global.
  const allRows = await prisma.reviewAnalysis.findMany({
    where: { businessId, source },
    select: {
      externalReviewId: true,
      sentiment: true,
      categories: true,
      positiveAspects: true,
      negativeAspects: true,
      summary: true,
    },
  });

  const analyses = allRows.map(toAnalysisResult);
  const global = computeGlobalAnalytics(analyses, reviews);

  // Categorías por reseña (índice) para el filtro por categoría. Se lee de
  // ReviewAnalysis ya persistido; no se llama a Groq ni se vuelve a analizar.
  const reviewCategories: ReviewCategory[] = allRows.map((row) => ({
    externalReviewId: row.externalReviewId,
    categories: Array.isArray(row.categories)
      ? row.categories.filter((x): x is string => typeof x === 'string')
      : [],
  }));

  return {
    ok: true,
    source,
    totalReviews: reviews.length,
    analyzedCount: analyses.length,
    newlyAnalyzed,
    global,
    reviewCategories,
  };
};
