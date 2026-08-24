// ─── Heurística ligera de negatividad ────────────────
// Detecta si un comentario de Instagram parece una queja
// para adaptar el tono de la respuesta generada por IA y
// para marcar el badge "Crítico" en la bandeja.
//
// No hace llamadas costosas: es una lista ampliada de
// marcadores (español, catalán, inglés y transliteración
// árabe) + patrones de negación. En el futuro se podría
// sustituir por análisis de sentimiento con IA.
// ─────────────────────────────────────────────────────

// Palabras y expresiones con alta precisión de negatividad.
const NEGATIVE_MARKERS = [
  // Español — quejas y críticas
  'pésimo', 'malísimo', 'malisimo', 'horrible', 'terrible', 'decepcion',
  'decepción', 'estafa', 'desastre', 'fracaso', 'fatal', 'asqueroso',
  'vergüenza', 'indignante', 'verguenza', 'insulto', 'insultante',
  'burla', 'ridículo', 'patético', 'espantoso', 'horroroso', 'lamentable',
  'un asco', 'una mierda', 'basura', 'infame', 'infamia', 'desgracia',
  'regate', 'robado', 'robaron', 'hurtaron', 'hurtado', 'estafaron',
  // Español — quejas de servicio/calidad/precio
  'devolución', 'reclamo', 'queja', 'no funciona', 'no llegó', 'no llego',
  'no lo recibo', 'no me lo da', 'mal servicio', 'mala atención',
  'malísima atención', 'mala atencion', 'mala experiencia', 'no vale',
  'no merece', 'no lo recomiendo', 'no recomiendo', 'no me gusta',
  'no me ha gustado', 'no estoy contento', 'no contento', 'enfadado',
  'defraudado', 'cabreado', 'molesto', 'encendida', 'encendido',
  'caro', 'carísimo', 'carisimo', 'caro para lo que', 'me robaron',
  'me han robado', 'no me devuelven', 'sin devolución', 'esperando mi',
  'llevo esperando', 'tardó', 'tardo mucho', 'llega frío', 'llegó frío',
  'comida fría', 'comida fria', 'despacho', 'mal hecho', 'mal estado',
  'no tiene gusto', 'sin sabor', 'soso', 'insípido', 'quemado', 'crudo',
  'no vale la pena', 'no me ha llegado', 'nunca más', 'nunca jamás',
  'no volver', 'no vuelvo', 'no lo vuelvo', 'no paso más', 'no paso',
  'meh', 'evitar', 'desaconsejo', 'no os lo recomiendo',
  // Español — insultos/intensificadores típicos de redes
  'enfermos', 'enfermo', 'pelotudo', 'verga', 'imbécil', 'imbecil',
  'tarado', 'estúpido', 'estupido', 'cadáver', 'lamentable trato',
  'mala gente', 'sinvergüenza', 'caradura', 'desvergonzado',
  // Catalán
  'pèssim', 'pessim', 'horrorós', 'horroros', 'terrible', 'estafa',
  'decebre', 'queixa', 'mala atenció', 'mal servei', 'car', 'caríssim',
  'carissim', 'no val', 'no el recomano', 'no m\'agrada', 'no em va agradar',
  'no torno', 'no hi tornaré', 'fat', 'tard', 'fred', 'cru', 'cremat',
  'nabí', 'com a llàstima', 'diners perduts', 'm\'han robat', 'm\'has robat',
  // Inglés
  'terrible', 'awful', 'worst', 'worstever', 'scam', 'ripoff', 'gross',
  'disgusting', 'cold', 'overpriced', 'waste', 'never again', 'do not recommend',
  'don\'t recommend', 'not recommended', 'terrible service', 'bad service',
  'rude', 'greedy', 'disappointed', 'unacceptable', 'refund', 'complaint',
  // Árabe (transliteración y frases comunes de protesta)
  'haram', 'حرام', 'كذب', 'غش', 'نصب', 'saram', 'qulub', 'kadab',
];

// Emojis/iconos claramente negativos.
const NEGATIVE_EMOJI = ['😡', '🤬', '👎', '🙄', '😤', '🤢', '🤮', '💩'];

// Excepciones: comentarios que parecen negativos pero son
// respuestas del propio negocio (@hfc.barcelona responde a
// usuarios) o contextos donde la palabra no es un ataque.
const OWN_ACCOUNT_RE = /^@\S+\s+.*(gracias|thank|de nada|buena|genial|sí|si|por supuesto)/i;

// Marcadores de islamofobia / discurso de odio religioso.
// Muy específicos para no marcar un comentario musulmán
// normal (por ejemplo "bismillah", "alhamdulillah", "inshallah").
const ISLAMOPHOBIC_MARKERS = [
  // Insultos y desprecio
  'moro', 'moros', 'moraco', 'moracas', 'moro de mierda', 'morica',
  'turco de mierda', 'musulman de mierda', 'musulmana de mierda',
  // Ataques al profeta
  'supuesto profeta', 'tu profeta', 'el falsa profeta', 'falso profeta',
  'profeta de la pedofilia', 'pedofilo tu profeta', 'tu mahoma',
  // Terrorismo / incendio
  'terrorista', 'yihad', 'yihadista', 'bomba en', 'explosion', 'decapita',
  'expulsadlos', 'fuera los', 'fuera de aqui los', 'invasion ',
  // Comparaciones y deshumanización
  'alá es un', 'vuestro dios es', 'vuestra religion es un',
  'come puerco en su pais', 'vuelve a tu pais', 'vuelve a tu pueblo',
  'no es tu pais', 'no es vuestra tierra', 'os vais a todos',
  'invadisteis', 'invadieron', 'colonizad', 'islamizacion',
  // Discurso anti-hijab/burkini despectivo
  'quitale el burka', 'fuera el hijab', 'prohibid el hijab',
  'no al burkini',
];

export function isIslamophobic(text: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return (
    ISLAMOPHOBIC_MARKERS.some((w) => lower.includes(w.toLowerCase())) &&
    // No aplicamos si es la propia cuenta musulmana hablando de su fe
    !/alhamdulillah|bismillah|inshallah|insha'allah|salam|waalikom|\bamin\b|allahumma/.test(lower)
  );
}

export function isLikelyNegative(text: string): boolean {
  if (isIslamophobic(text)) return true;
  if (!text) return false;
  const lower = text.toLowerCase();

  // Si es una respuesta amable del negocio, no marcar como crítico.
  if (OWN_ACCOUNT_RE.test(text)) return false;

  const hasMarker = NEGATIVE_MARKERS.some((w) =>
    lower.includes(w.toLowerCase()),
  );
  if (hasMarker) return true;

  // Negaciones compuestas: "no + adjetivo" sin palabra clave,
  // p. ej. "no estaba bueno", "no merece la pena", "no sirve".
  const negationPatterns = [
    /no (estaba|está|estuvo|ha estado|había) (bueno|buen|rico|sabroso|bien|genial|rico)/,
    /no (está|estaba|es) (hecho|listo|terminado)/,
    /no sirve/,
    /no me (gustó|gusta|fue|apareció)+/,
  ];
  if (negationPatterns.some((re) => re.test(lower))) return true;

  return NEGATIVE_EMOJI.some((e) => lower.includes(e));
}