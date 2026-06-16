'use server';

import { GoogleGenerativeAI } from '@google/generative-ai';

export async function generateReviewResponse(
  reviewText: string,
  businessName: string,
  rating: number,
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('Falta GEMINI_API_KEY en .env.local');

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt =
    rating <= 2
      ? `Eres el dueño de "${businessName}". Un cliente te ha dejado una reseña negativa (${rating}★) en Google. Genera una respuesta profesional, empática y educada en español (máx 150 palabras) que agradezca el feedback, pida disculpas si es necesario e invite al cliente a contactaros en privado para resolver el problema. Reseña: "${reviewText}"`
      : `Eres el dueño de "${businessName}". Un cliente te ha dejado una reseña con ${rating}★ en Google. Genera una respuesta profesional y amable en español (máx 100 palabras) que agradezca la reseña y exprese compromiso con la mejora continua. Reseña: "${reviewText}"`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  if (!text) throw new Error('Gemini no devolvió contenido');
  return text.trim();
}
