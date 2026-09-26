// Heurística ligera de negatividad: detecta si un comentario parece una queja
// para adaptar el tono de la respuesta de IA y marcar el badge "Crítico".
// Es una lista de marcadores (español, catalán, inglés y árabe) + negaciones;
// no hace llamadas costosas.

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

// Respuestas amables del propio negocio: parecen negativas pero no lo son.
const OWN_ACCOUNT_RE =
  /^@\S+\s+.*(gracias|thank|de nada|buena|genial|sí|si|por supuesto)/i;

// Marcadores de islamofobia/discurso de odio religioso. Muy específicos para
// no marcar un comentario musulmán normal ("bismillah", "alhamdulillah"...).
const ISLAMOPHOBIC_MARKERS = [
  'moro', 'moros', 'moraco', 'moracas', 'moro de mierda', 'morica',
  'turco de mierda', 'musulman de mierda', 'musulmana de mierda',
  'supuesto profeta', 'tu profeta', 'el falsa profeta', 'falso profeta',
  'profeta de la pedofilia', 'pedofilo tu profeta', 'tu mahoma',
  'terrorista', 'yihad', 'yihadista', 'bomba en', 'explosion', 'decapita',
  'expulsadlos', 'fuera los', 'fuera de aqui los', 'invasion ',
  'alá es un', 'vuestro dios es', 'vuestra religion es un',
  'come puerco en su pais', 'vuelve a tu pais', 'vuelve a tu pueblo',
  'no es tu pais', 'no es vuestra tierra', 'os vais a todos',
  'invadisteis', 'invadieron', 'colonizad', 'islamizacion',
  'quitale el burka', 'fuera el hijab', 'prohibid el hijab',
  'no al burkini',
];

export function isIslamophobic(text: string): boolean {
  if (!text) return false;
  const normalizedText = text.toLowerCase();
  const hasHateMarker = ISLAMOPHOBIC_MARKERS.some((marker) =>
    normalizedText.includes(marker.toLowerCase()),
  );
  // No aplicamos si es la propia cuenta musulmana hablando de su fe.
  const isOwnFaith =
    /alhamdulillah|bismillah|inshallah|insha'allah|salam|waalikom|\bamin\b|allahumma/.test(
      normalizedText,
    );
  return hasHateMarker && !isOwnFaith;
}

export function isLikelyNegative(text: string): boolean {
  if (isIslamophobic(text)) return true;
  if (!text) return false;
  const normalizedText = text.toLowerCase();

  // Si es una respuesta amable del negocio, no marcar como crítico.
  if (OWN_ACCOUNT_RE.test(text)) return false;

  const hasMarker = NEGATIVE_MARKERS.some((marker) =>
    normalizedText.includes(marker.toLowerCase()),
  );
  if (hasMarker) return true;

  // Negaciones compuestas: "no + adjetivo" sin palabra clave.
  const negationPatterns = [
    /no (estaba|está|estuvo|ha estado|había) (bueno|buen|rico|sabroso|bien|genial|rico)/,
    /no (está|estaba|es) (hecho|listo|terminado)/,
    /no sirve/,
    /no me (gustó|gusta|fue|apareció)+/,
  ];
  if (negationPatterns.some((pattern) => pattern.test(normalizedText))) {
    return true;
  }

  return NEGATIVE_EMOJI.some((emoji) => normalizedText.includes(emoji));
}
