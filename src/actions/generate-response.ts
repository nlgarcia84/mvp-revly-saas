'use server';

const API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// ─── Llamada base a Groq ─────────────────────────────
// Todas las funciones de IA comparten la misma llamada a
// la API. El system + prompt varía según el canal
// (reseña de Google o comentario de Instagram).
// ─────────────────────────────────────────────────────
async function callGroq(system: string, prompt: string, maxTokens = 400) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('Falta GROQ_API_KEY en .env.local');

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
      max_tokens: maxTokens,
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

// ─── Responde a una reseña de Google ─────────────────
// Separamos el prompt según la valoración: las reseñas de
// 1-2 estrellas piden disculpa y compensación; las de
// 3-5 estrellas agradecen. El tono es formal.
// ─────────────────────────────────────────────────────
export async function generateReviewResponse(
  reviewText: string,
  businessName: string,
  rating: number,
): Promise<string> {
  const system = rating <= 2
    ? `Eres el dueño de "${businessName}". Responde a esta reseña de Google en castellano. Escribe un texto completo de entre 100 y 200 palabras, en párrafos. Menciona los puntos concretos de la reseña. Sé empático, discúlpate si toca e invita a contactar en privado. No seas genérico.`
    : `Eres el dueño de "${businessName}". Responde a esta reseña de Google en castellano. Escribe un texto completo de entre 80 y 150 palabras, en párrafos. Agradece y menciona algo concreto de la reseña. No seas genérico.`;

  const prompt = `Cliente: "${reviewText}" (${rating}★)

Escribe solo la respuesta, sin presentaciones ni despedidas adicionales. Empieza directamente con "Estimado/a" o similar.`;

  return callGroq(system, prompt);
}

// ─── Responde a un comentario de Instagram ───────────
// El tono en Instagram es mucho más cercano y breve. Se
// menciona algo concreto del comentario y, si es negativo,
// se agradece el feedback, se disculpa y se invita a
// escribir por mensaje directo.
// ─────────────────────────────────────────────────────
export async function generateCommentResponse(
  commentText: string,
  businessName: string,
  negative: boolean,
  platform: 'instagram' = 'instagram',
): Promise<string> {
  const system = negative
    ? `Eres el community manager de "${businessName}" en ${platform === 'instagram' ? 'Instagram' : 'Facebook'}. Responde a este comentario en castellano. Sé cercano, natural y breve (2 frases máximo, sin hashtags). Agradece el aviso, discúlpate si toca y termina invitando a escribir por mensaje directo para resolverlo. Usa un emoji de apoyo como máximo. No seas genérico: menciona algo concreto del comentario.`
    : `Eres el community manager de "${businessName}" en ${platform === 'instagram' ? 'Instagram' : 'Facebook'}. Responde a este comentario en castellano. Sé cercano, natural y breve (1 o 2 frases). Da las gracias y menciona algo concreto del comentario. Un solo emoji a lo sumo. No seas genérico.`;

  const prompt = `Comentario: "${commentText}"

Escribe solo la respuesta del negocio, sin presentaciones ni despedidas adicionales.`;

  return callGroq(system, prompt, 150);
}