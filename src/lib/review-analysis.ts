// ─────────────────────────────────────────────────────────────
// Smart Analytics — motor puro (sin I/O de BD ni server-only).
// Normaliza las reseñas que ya devuelve el sistema (Places / GBP),
// deriva un id determinista, construye el prompt de IA, valida el
// JSON resultante y calcula la analítica global a partir de los
// análisis individuales. No envía todas las reseñas a Groq.
// ─────────────────────────────────────────────────────────────

export type ReviewSource = 'google-places' | 'google-business-profile';

export type NormalizedReview = {
  source: ReviewSource;
  externalReviewId: string;
  authorName: string;
  rating: number;
  text: string;
  time: number; // epoch en segundos
  reviewName?: string;
};

export type Sentiment = 'positive' | 'neutral' | 'negative';

export type ReviewAnalysisResult = {
  sentiment: Sentiment;
  categories: string[];
  positiveAspects: string[];
  negativeAspects: string[];
  summary: string;
};

export type Conclusions = {
  general: string;
  proposals: string[];
};

// Contexto agregado que se envía a la IA para generar las propuestas
// globales. Reúne toda la información relevante del análisis agregado
// (negocio, conclusión, fortalezas, problemas, categorías, sentimiento y
// resúmenes de las reseñas) en un único prompt.
export type ProposalsContext = {
  businessName: string;
  general: string;
  strengths: string[];
  problems: string[];
  categories: string[];
  sentiment: { positive: number; neutral: number; negative: number };
  total: number;
  reviewSummaries: string[];
};

export type GlobalAnalytics = {
  total: number;
  sentimentDistribution: { positive: number; neutral: number; negative: number };
  starDistribution: { '1': number; '2': number; '3': number; '4': number; '5': number };
  topCategories: { name: string; count: number }[];
  strengths: { text: string; count: number }[];
  recurringProblems: { text: string; count: number }[];
  conclusions: Conclusions;
};

// Hash FNV-1a (determinista, sin dependencias) para el id de fallback.
function hashId(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

// Id determinista de una reseña. Preferimos `reviewName` (nombre completo
// del recurso en Business Profile). Fallback: hash de autor + fecha + rating
// (nunca el texto como único identificador).
export function deriveExternalReviewId(
  review: { reviewName?: string; authorName: string; time: number; rating: number },
  source: ReviewSource,
): string {
  if (review.reviewName) return review.reviewName;
  return `fnv:${hashId(`${source}|${review.authorName}|${review.time}|${review.rating}`)}`;
}

// Normaliza las reseñas (Places o GBP) a una estructura interna común.
export function normalizeReviews(
  reviews: Array<{
    authorName: string;
    rating: number;
    text: string;
    time: number;
    reviewName?: string;
  }>,
  source: ReviewSource,
): NormalizedReview[] {
  return reviews.map((r) => ({
    source,
    externalReviewId: deriveExternalReviewId(r, source),
    authorName: r.authorName ?? '',
    rating: Number(r.rating) || 0,
    text: (r.text ?? '').trim(),
    time: Number(r.time) || 0,
    reviewName: r.reviewName,
  }));
}

// System prompt para el análisis individual. Pide JSON estricto.
export const ANALYSIS_SYSTEM_PROMPT = `Eres un analista de reputación. Analiza la reseña de un cliente y devuelve ÚNICAMENTE un objeto JSON válido, sin texto adicional ni markdown, con esta estructura exacta:
{
  "sentiment": "positive" | "neutral" | "negative",
  "categories": ["string"],        // 1 a 3 categorías en español, en minúsculas (ej: "servicio", "comida", "precio", "instalaciones", "personal", "tiempo de espera", "limpieza")
  "positiveAspects": ["string"],   // aspectos positivos concretos mencionados (máx 5)
  "negativeAspects": ["string"],   // aspectos negativos concretos mencionados (máx 5)
  "summary": "string"              // resumen de 1 frase en español de la reseña
}
No inventes información: usa solo lo que dice la reseña. Si no hay aspectos de un tipo, devuelve un array vacío.`;

export function buildAnalysisUserPrompt(review: NormalizedReview): string {
  const text = review.text || '(sin comentario)';
  return `Reseña (${review.rating}★): "${text}"`;
}

// Extrae y valida el JSON que devuelve Groq. Devuelve null si no es válido.
export function parseAnalysisJson(raw: string): ReviewAnalysisResult | null {
  if (!raw) return null;

  const text = raw.replace(/```(?:json)?/gi, '').trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== 'object') return null;
  const obj = parsed as Record<string, unknown>;

  const sentimentRaw = typeof obj.sentiment === 'string' ? obj.sentiment : '';
  const sentiment: Sentiment =
    sentimentRaw === 'positive' ||
    sentimentRaw === 'neutral' ||
    sentimentRaw === 'negative'
      ? sentimentRaw
      : 'neutral';

  const toStrArray = (value: unknown): string[] =>
    Array.isArray(value)
      ? value
          .filter((v): v is string => typeof v === 'string')
          .map((v) => v.trim())
          .filter(Boolean)
          .slice(0, 10)
      : [];

  const summary =
    typeof obj.summary === 'string' && obj.summary.trim()
      ? obj.summary.trim()
      : '';

  return {
    sentiment,
    categories: toStrArray(obj.categories),
    positiveAspects: toStrArray(obj.positiveAspects),
    negativeAspects: toStrArray(obj.negativeAspects),
    summary,
  };
}

// Cuenta ocurrencias y devuelve los N más frecuentes.
function topItems(
  items: string[],
  limit: number,
): { text: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = item.toLowerCase().trim();
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([text, count]) => ({ text, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

// Analítica global construida a partir de los análisis individuales
// (no se llama a Groq; es agregación determinista).
// `proposals` es opcional: si se pasa, sustituye a las propuestas
// deterministas (lo usa el server action para inyectar las propuestas
// generadas por IA o las persistidas).
export function computeGlobalAnalytics(
  analyses: ReviewAnalysisResult[],
  reviews: NormalizedReview[],
  proposals?: string[],
): GlobalAnalytics {
  const total = analyses.length;

  const sentimentDistribution = {
    positive: 0,
    neutral: 0,
    negative: 0,
  };
  const categories: string[] = [];
  const positiveAspects: string[] = [];
  const negativeAspects: string[] = [];

  for (const a of analyses) {
    sentimentDistribution[a.sentiment]++;
    categories.push(...a.categories);
    positiveAspects.push(...a.positiveAspects);
    negativeAspects.push(...a.negativeAspects);
  }

  const starDistribution = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
  for (const r of reviews) {
    const star = Math.min(5, Math.max(1, Math.round(r.rating)));
    if (star >= 1 && star <= 5) {
      starDistribution[String(star) as '1' | '2' | '3' | '4' | '5']++;
    }
  }

  const topCategories = topItems(categories, 6).map(({ text, count }) => ({
    name: text,
    count,
  }));
  const strengths = topItems(positiveAspects, 5);
  const recurringProblems = topItems(negativeAspects, 5);

  const conclusions = buildConclusions({
    total,
    sentimentDistribution,
    strengths,
    recurringProblems,
    proposals,
  });

  return {
    total,
    sentimentDistribution,
    starDistribution,
    topCategories,
    strengths,
    recurringProblems,
    conclusions,
  };
}

function buildGeneralConclusion(data: {
  total: number;
  sentimentDistribution: GlobalAnalytics['sentimentDistribution'];
  strengths: GlobalAnalytics['strengths'];
  recurringProblems: GlobalAnalytics['recurringProblems'];
}): string {
  const { total, sentimentDistribution, strengths, recurringProblems } = data;

  if (total === 0) return 'Todavía no hay reseñas analizadas.';

  const { positive, neutral, negative } = sentimentDistribution;
  const pct = (n: number) =>
    Math.round((n / total) * 100);

  const dominant: Sentiment =
    positive >= negative && positive >= neutral
      ? 'positive'
      : negative >= neutral
        ? 'negative'
        : 'neutral';

  const dominantLabel: Record<Sentiment, string> = {
    positive: 'positivas',
    neutral: 'neutras',
    negative: 'negativas',
  };

  const parts: string[] = [];
  parts.push(
    `Se han analizado ${total} reseñas, de las cuales el ${pct(dominant === 'positive' ? positive : dominant === 'negative' ? negative : neutral)}% son ${dominantLabel[dominant]}.`,
  );

  const topStrengths = strengths.slice(0, 3).map((s) => s.text);
  if (topStrengths.length > 0) {
    parts.push(`Destacan especialmente ${topStrengths.join(', ')}.`);
  }

  const topProblems = recurringProblems.slice(0, 3).map((s) => s.text);
  if (topProblems.length > 0) {
    parts.push(
      `Las principales oportunidades se concentran en ${topProblems.join(', ')}.`,
    );
  }

  return parts.join(' ');
}

// Reglas deterministas que convierten un problema detectado en una propuesta
// de acción concreta. Solo se aplican sobre los problemas reales ya detectados
// en los análisis (nunca se inventa información ni se llama a la IA). Son el
// fallback cuando la generación IA no está disponible.
const PROPOSAL_RULES: { patterns: RegExp[]; proposal: string }[] = [
  {
    patterns: [/espera|tarda|tard[oó]|demora|lent[oa]|tiempo/],
    proposal:
      'Agilizar el servicio en los momentos de mayor demanda: revisar los picos de afluencia y redistribuir tareas para reducir los tiempos de espera.',
  },
  {
    patterns: [/fr[ií][oa]|temperatura|caliente/],
    proposal:
      'Garantizar que los platos lleguen a la temperatura adecuada, revisando el flujo entre cocina y servicio.',
  },
  {
    patterns: [/combo|promoci[oó]n|oferta|disponibilidad|agotad|no hab[ií]a/],
    proposal:
      'Alinear la comunicación de combos y ofertas con su disponibilidad real para no generar expectativas que no se puedan cumplir.',
  },
  {
    patterns: [/recoger|recoge|autoservicio|servicio en mesa|en mesa|pedir en barra/],
    proposal:
      'Clarificar el flujo de servicio para que el cliente no tenga que recoger sus propios platos ni pedir en barra si no corresponde.',
  },
  {
    patterns: [/precio|car[oa]|car[ií]simo|coste/],
    proposal:
      'Revisar la relación calidad-precio y comunicar mejor el valor de los productos mencionados en las reseñas.',
  },
  {
    patterns: [/atenci[oó]n|camarer|personal|emplead|trato|groser|maleducad|desgana|inter[eé]s|don de gentes/],
    proposal:
      'Definir unas pautas comunes de atención al cliente (bienvenida, detección de necesidades, tono y resolución de conflictos) para todo el equipo.',
  },
  {
    patterns: [/calidad|sabor|ins[ií]pido|soso|quemado|crudo|preparaci[oó]n|chicloso|duro|seco|malo/],
    proposal:
      'Revisar la preparación de los platos mencionados para asegurar una calidad y un sabor consistentes.',
  },
  {
    patterns: [/limpieza|suci[oa]|higiene|ba[ñn]o|limpio/],
    proposal:
      'Reforzar la limpieza e higiene de las instalaciones, con especial atención a los puntos señalados en las reseñas.',
  },
  {
    patterns: [/estacionamiento|aparcar|parking|aparcamiento/],
    proposal:
      'Facilitar el estacionamiento de los clientes con información clara o alternativas cercanas.',
  },
  {
    patterns: [/entrega|delivery|reparto|env[ií]o|pedido/],
    proposal:
      'Optimizar el proceso de entrega o reparto para cumplir los plazos prometidos.',
  },
];

// Genera hasta 4 propuestas concretas a partir de los problemas detectados.
// Los problemas que comparten una misma causa se agrupan en una sola propuesta.
function generateProposals(
  problems: { text: string; count: number }[],
): string[] {
  const proposals: string[] = [];
  for (const problem of problems.slice(0, 4)) {
    const rule = PROPOSAL_RULES.find((r) =>
      r.patterns.some((re) => re.test(problem.text)),
    );
    const proposal = rule
      ? rule.proposal
      : `Definir un plan de acción concreto para abordar el siguiente aspecto detectado: ${problem.text}.`;
    if (!proposals.includes(proposal)) proposals.push(proposal);
    if (proposals.length >= 4) break;
  }
  return proposals;
}

// System prompt para la generación global de propuestas. Pide JSON estricto.
export const PROPOSALS_SYSTEM_PROMPT = `Eres un consultor de negocio local especializado en reputación online. A partir del análisis agregado de las reseñas de Google de un negocio, genera propuestas de mejora accionables y específicas. Devuelve ÚNICAMENTE un objeto JSON válido, sin texto adicional ni markdown, con esta estructura exacta:
{
  "proposals": ["string"]
}
Reglas:
- Genera entre 2 y 4 propuestas como máximo.
- Cada propuesta debe ser un siguiente paso accionable y concreto, no una reformulación del problema.
- No repitas literalmente los "aspectos a mejorar".
- Agrupa problemas relacionados en una única propuesta cuando tenga sentido.
- Cuando una fortaleza detectada pueda ayudar a resolver un problema, intégrala en la propuesta (fortaleza + problema → propuesta).
- Sé específico del negocio y de lo que dicen las reseñas. No inventes problemas que no aparezcan ni des consejos genéricos aplicables a cualquier negocio.
- Prioriza las oportunidades más importantes.
- Escribe en español, en tono profesional, directo y útil.`;

export function buildProposalsUserPrompt(ctx: ProposalsContext): string {
  const lines: string[] = [];
  lines.push(`Negocio: ${ctx.businessName || '(no disponible)'}`);
  lines.push(`Total de reseñas analizadas: ${ctx.total}`);
  lines.push(
    `Distribución de sentimiento: ${ctx.sentiment.positive} positivas, ${ctx.sentiment.neutral} neutras, ${ctx.sentiment.negative} negativas.`,
  );
  if (ctx.categories.length > 0) {
    lines.push(`Categorías principales: ${ctx.categories.join(', ')}.`);
  }
  lines.push(`Conclusión general: ${ctx.general}`);
  if (ctx.strengths.length > 0) {
    lines.push(
      `Fortalezas detectadas:\n${ctx.strengths.map((s) => `- ${s}`).join('\n')}`,
    );
  }
  if (ctx.problems.length > 0) {
    lines.push(
      `Aspectos a mejorar detectados:\n${ctx.problems.map((s) => `- ${s}`).join('\n')}`,
    );
  }
  if (ctx.reviewSummaries.length > 0) {
    lines.push(
      `Resúmenes de las reseñas analizadas:\n${ctx.reviewSummaries
        .map((s) => `- ${s}`)
        .join('\n')}`,
    );
  }
  lines.push('Genera ahora las propuestas de mejora (entre 2 y 4).');
  return lines.join('\n');
}

// Extrae y valida el JSON de propuestas. Devuelve null si no es válido.
export function parseProposalsJson(raw: string): string[] | null {
  if (!raw) return null;

  const text = raw.replace(/```(?:json)?/gi, '').trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== 'object') return null;
  const obj = parsed as Record<string, unknown>;

  const proposals = Array.isArray(obj.proposals)
    ? obj.proposals
        .filter((v): v is string => typeof v === 'string')
        .map((v) => v.trim())
        .filter(Boolean)
    : [];

  if (proposals.length === 0) return null;
  return proposals.slice(0, 4);
}

// Conclusiones y propuestas agregadas. Las propuestas pueden venir
// inyectadas (IA o persistidas); si no, se usan las deterministas.
function buildConclusions(data: {
  total: number;
  sentimentDistribution: GlobalAnalytics['sentimentDistribution'];
  strengths: GlobalAnalytics['strengths'];
  recurringProblems: GlobalAnalytics['recurringProblems'];
  proposals?: string[];
}): Conclusions {
  return {
    general: buildGeneralConclusion(data),
    proposals:
      data.proposals && data.proposals.length > 0
        ? data.proposals
        : generateProposals(data.recurringProblems),
  };
}

// Procesa un array con concurrencia limitada. Evita Promise.all con miles
// de llamadas Groq simultáneas; la estructura permite moverlo a un job/queue
// posterior sin reescribir el motor.
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  const worker = async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await fn(items[index]);
    }
  };

  const workerCount = Math.max(1, Math.min(limit, items.length));
  await Promise.all(
    Array.from({ length: workerCount }, () => worker()),
  );

  return results;
}
