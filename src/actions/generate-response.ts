'use server';

const HF_API = 'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3';

export async function generateReviewResponse(
  reviewText: string,
  businessName: string,
  rating: number,
): Promise<string> {
  const prompt =
    rating <= 2
      ? `[INST] Eres el dueño de "${businessName}". Un cliente te ha dejado una reseña negativa (${rating}★) en Google. Genera una respuesta profesional, empática y educada en español (máx 150 palabras) que agradezca el feedback, pida disculpas si es necesario e invite al cliente a contactaros en privado para resolver el problema. Reseña: "${reviewText}" [/INST]`
      : `[INST] Eres el dueño de "${businessName}". Un cliente te ha dejado una reseña con ${rating}★ en Google. Genera una respuesta profesional y amable en español (máx 100 palabras) que agradezca la reseña y exprese compromiso con la mejora continua. Reseña: "${reviewText}" [/INST]`;

  const res = await fetch(HF_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      inputs: prompt,
      parameters: { max_new_tokens: 300, temperature: 0.7 },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HuggingFace API error ${res.status}: ${body}`);
  }

  const data = await res.json();
  const text = Array.isArray(data)
    ? data[0]?.generated_text
    : data.generated_text;

  if (!text) throw new Error('HuggingFace no devolvió contenido');

  // Extract only the response after [/INST]
  const response = text.split('[/INST]').pop()?.trim() ?? text.trim();
  return response;
}
