'use server';

const ENDPOINTS = ['v1', 'v1beta'].flatMap((v) =>
  [
    'gemini-2.0-flash-001',
    'gemini-2.0-flash',
    'gemini-1.5-flash-001',
    'gemini-1.5-flash',
    'gemini-1.5-flash-latest',
    'gemini-1.5-pro-001',
    'gemini-1.5-pro',
  ].map(
    (m) => `https://generativelanguage.googleapis.com/${v}/models/${m}:generateContent`,
  ),
);

const OPENAI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';

export async function generateReviewResponse(
  reviewText: string,
  businessName: string,
  rating: number,
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('Falta GEMINI_API_KEY en .env.local');

  const systemMsg =
    'Eres un asistente experto en gestión de reseñas y atención al cliente.';
  const userMsg =
    rating <= 2
      ? `Eres el dueño de "${businessName}". Un cliente te ha dejado una reseña negativa (${rating}★) en Google. Genera una respuesta profesional, empática y educada en español (máx 150 palabras) que agradezca el feedback, pida disculpas si es necesario e invite al cliente a contactaros en privado para resolver el problema. Reseña: "${reviewText}"`
      : `Eres el dueño de "${businessName}". Un cliente te ha dejado una reseña con ${rating}★ en Google. Genera una respuesta profesional y amable en español (máx 100 palabras) que agradezca la reseña y exprese compromiso con la mejora continua. Reseña: "${reviewText}"`;

  // Try OpenAI-compatible endpoint first
  try {
    const oaiRes = await fetch(OPENAI_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gemini-1.5-flash',
        messages: [
          { role: 'system', content: systemMsg },
          { role: 'user', content: userMsg },
        ],
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    if (oaiRes.ok) {
      const data = await oaiRes.json();
      const text = data.choices?.[0]?.message?.content;
      if (text) return text.trim();
    }
  } catch {
    // fall through
  }

  // Try native Gemini API endpoints
  const body = JSON.stringify({
    contents: [{ parts: [{ text: `${systemMsg}\n\n${userMsg}` }] }],
    generationConfig: { maxOutputTokens: 300, temperature: 0.7 },
  });

  for (const url of ENDPOINTS) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body,
      });
      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text.trim();
      }
    } catch {
      // continue
    }
  }

  throw new Error(
    'Gemini API no disponible. Asegúrate de que la clave es de Google AI Studio (https://aistudio.google.com/apikey) y que la API de Generative Language está habilitada en el proyecto.',
  );
}
