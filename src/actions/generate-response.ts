'use server';

const API_URL = 'https://api.groq.com/openai/v1/chat/completions';

export async function generateReviewResponse(
  reviewText: string,
  businessName: string,
  rating: number,
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('Falta GROQ_API_KEY en .env.local');

  const system = rating <= 2
    ? `Eres el dueño de "${businessName}". Responde a esta reseña de Google en castellano. Escribe un texto completo de entre 100 y 200 palabras, en párrafos. Menciona los puntos concretos de la reseña. Sé empático, discúlpate si toca e invita a contactar en privado. No seas genérico.`
    : `Eres el dueño de "${businessName}". Responde a esta reseña de Google en castellano. Escribe un texto completo de entre 80 y 150 palabras, en párrafos. Agradece y menciona algo concreto de la reseña. No seas genérico.`;

  const prompt = `Cliente: "${reviewText}" (${rating}★)

Escribe solo la respuesta, sin presentaciones ni despedidas adicionales. Empieza directamente con "Estimado/a" o similar.`;

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
      max_tokens: 400,
      temperature: 0.8,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Groq API error ${res.status}: ${body}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('Groq no devolvió contenido');

  return text.trim();
}
