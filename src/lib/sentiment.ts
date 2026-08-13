// ─── Heurística ligera de negatividad ────────────────
// Detecta si un comentario de Instagram parece una queja
// para adaptar el tono de la respuesta generada por IA.
// En el futuro se podría sustituir por análisis de
// sentimiento con IA.
// ─────────────────────────────────────────────────────
const NEGATIVE_WORDS = [
  'pésimo', 'malísimo', 'horrible', 'terrible', 'decepcion', 'estafa',
  'nunca', 'jamás', 'devolución', 'reclamo', 'queja', 'desastre',
  'fracaso', 'no volver', 'fatal', 'asqueroso', 'peor', 'vergüenza',
  'indignante', 'pierdo', 'perdí', 'hurtaron', 'robaron',
];

export function isLikelyNegative(text: string): boolean {
  const lower = text.toLowerCase();
  return NEGATIVE_WORDS.some((w) => lower.includes(w));
}