'use server';

const API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Modelo de Groq. `llama-3.3-70b-versatile` fue retirado; usamos
// `qwen/qwen3.8-27b`, que devuelve el texto en `message.content`.
const MODEL = 'qwen/qwen3.8-27b';

// Llamada base a Groq. El system + prompt varía según el canal.
async function callGroq(system: string, prompt: string, maxTokens = 400) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('Falta GROQ_API_KEY en .env.local');

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
      max_tokens: maxTokens,
      temperature: 0.8,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error(`[AI] Groq API error ${response.status}:`, body);
    throw new Error(`Groq API error ${response.status}: ${body}`);
  }

  const payload = await response.json();
  const text = payload.choices?.[0]?.message?.content;
  if (!text) {
    console.error('[AI] Groq no devolvió contenido:', JSON.stringify(payload));
    throw new Error('Groq no devolvió contenido');
  }

  return text.trim();
}

// Genera una respuesta a una reseña de Google. Las reseñas de 1-2 estrellas
// piden disculpa y compensación; las de 3-5 estrellas agradecen.
export async function generateReviewResponse(
  reviewText: string,
  businessName: string,
  rating: number,
): Promise<string> {
  const system =
    rating <= 2
      ? `Eres el dueño de "${businessName}". Responde a esta reseña de Google en castellano. Escribe un texto completo de entre 100 y 200 palabras, en párrafos. Menciona los puntos concretos de la reseña. Sé empático, discúlpate si toca e invita a contactar en privado. No seas genérico.`
      : `Eres el dueño de "${businessName}". Responde a esta reseña de Google en castellano. Escribe un texto completo de entre 80 y 150 palabras, en párrafos. Agradece y menciona algo concreto de la reseña. No seas genérico.`;

  const prompt = `Cliente: "${reviewText}" (${rating}★)

Escribe solo la respuesta, sin presentaciones ni despedidas adicionales. Empieza directamente con "Estimado/a" o similar.`;

  try {
    return await callGroq(system, prompt);
  } catch (error) {
    console.error('[AI] generateReviewResponse falló:', error);
    throw new Error(
      error instanceof Error
        ? error.message
        : 'Error al generar la respuesta con IA',
    );
  }
}

// Genera una respuesta a un comentario de Instagram o Facebook. El tono es
// cercano y breve; si es negativo, se agradece el feedback y se invita a DM.
export async function generateCommentResponse(
  commentText: string,
  businessName: string,
  negative: boolean,
  platform: 'instagram' | 'facebook' = 'instagram',
): Promise<string> {
  const network = platform === 'instagram' ? 'Instagram' : 'Facebook';

  const system = negative
    ? `Eres el community manager de "${businessName}" en ${network}. Responde a este comentario en castellano. Sé cercano, natural y breve (2 frases máximo, sin hashtags). Agradece el aviso, discúlpate si toca y termina invitando a escribir por mensaje directo para resolverlo. Usa un emoji de apoyo como máximo. No seas genérico: menciona algo concreto del comentario.`
    : `Eres el community manager de "${businessName}" en ${network}. Responde a este comentario en castellano. Sé cercano, natural y breve (1 o 2 frases). Da las gracias y menciona algo concreto del comentario. Un solo emoji a lo sumo. No seas genérico.`;

  const prompt = `Comentario: "${commentText}"

Escribe solo la respuesta del negocio, sin presentaciones ni despedidas adicionales.`;

  try {
    return await callGroq(system, prompt, 150);
  } catch (error) {
    console.error('[AI] generateCommentResponse falló:', error);
    throw new Error(
      error instanceof Error
        ? error.message
        : 'Error al generar la respuesta con IA',
    );
  }
}
