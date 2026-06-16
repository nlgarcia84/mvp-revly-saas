'use server';

const GEMINI_API = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

export async function generateReviewResponse(
  reviewText: string,
  businessName: string,
  rating: number,
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('Falta GEMINI_API_KEY en .env.local');

  const prompt = rating <= 2
    ? `Eres el dueño de "${businessName}". Un cliente te ha dejado una reseña negativa (${rating}★) en Google. Genera una respuesta profesional, empática y educada en español (máx 150 palabras) que agradezca el feedback, pida disculpas si es necesario e invite al cliente a contactaros en privado para resolver el problema. Reseña: "${reviewText}"`
    : `Eres el dueño de "${businessName}". Un cliente te ha dejado una reseña con ${rating}★ en Google. Genera una respuesta profesional y amable en español (máx 100 palabras) que agradezca la reseña y exprese compromiso con la mejora continua. Reseña: "${reviewText}"`;

  const res = await fetch(`${GEMINI_API}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: prompt }],
      }],
      generationConfig: {
        maxOutputTokens: 300,
        temperature: 0.7,
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${body}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini no devolvió contenido');

  return text.trim();
}
