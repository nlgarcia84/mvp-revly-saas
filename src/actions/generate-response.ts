'use server';

export async function generateReviewResponse(
  reviewText: string,
  _businessName: string,
  rating: number,
): Promise<string> {
  const name = _businessName;

  const templates: Record<string, string[]> = {
    '1': [
      `Gracias por compartir tu experiencia en ${name}. Lamentamos profundamente no haber cumplido con tus expectativas. Nos tomamos muy en serio cada opinión y trabajaremos en los puntos que mencionas para mejorar. Nos encantaría poder hablar contigo directamente para entender mejor lo ocurrido y encontrar una solución. Por favor, escríbenos a nuestro correo o redes sociales.`,
      `Agradecemos tu sinceridad en ${name}. Cada crítica constructiva nos ayuda a crecer y vamos a revisar internamente los aspectos que mencionas para corregirlos. Sentimos no haber estado a la altura en esta ocasión. Si nos das la oportunidad, nos encantaría recuperar tu confianza.`,
    ],
    '2': [
      `Gracias por tu reseña en ${name}. Valoramos tu opinión y lamentamos que tu experiencia no haya sido completamente satisfactoria. Tomamos nota de tus comentarios para seguir mejorando cada día. Nos gustaría conocer más detalles para poder resolverlo. No dudes en contactarnos directamente.`,
      `Apreciamos que te hayas tomado el tiempo de compartir tu opinión sobre ${name}. Revisaremos los puntos que mencionas con nuestro equipo para implementar mejoras. Tu feedback es fundamental para nosotros.`,
    ],
    '3': [
      `Gracias por tu reseña en ${name}. Nos alegra que hayas compartido tu experiencia y tomamos en cuenta tus comentarios para seguir mejorando. Trabajamos cada día para ofrecer el mejor servicio posible y tu opinión nos ayuda a conseguirlo.`,
      `Valoramos mucho tu opinión sobre ${name}. Seguiremos esforzándonos para superar tus expectativas en tu próxima visita. ¡Gracias por ayudarnos a mejorar!`,
    ],
    '4': [
      `¡Gracias por tu positiva reseña en ${name}! Nos encanta saber que tu experiencia fue satisfactoria. Tu opinión nos motiva a seguir dando lo mejor de nosotros. ¡Esperamos verte de nuevo pronto!`,
      `Agradecemos tu valoración en ${name}. Trabajamos cada día para ofrecer la mejor experiencia posible y saber que lo conseguimos es nuestra mayor recompensa. ¡Hasta pronto!`,
    ],
    '5': [
      `¡Muchas gracias por tu increíble reseña en ${name}! Nos llena de alegría saber que tu experiencia fue excelente. Tu opinión es el mejor reconocimiento a nuestro trabajo. ¡Esperamos verte de nuevo muy pronto!`,
      `Nos encanta leer reseñas como la tuya en ${name}. Saber que disfrutaste de tu experiencia nos motiva a seguir mejorando cada día. ¡Gracias por tu confianza y te esperamos con los brazos abiertos!`,
    ],
  };

  const options = templates[String(rating)] ?? templates['3'];
  const index = Math.floor(Math.random() * options.length);
  const response = options[index];

  return response;
}
