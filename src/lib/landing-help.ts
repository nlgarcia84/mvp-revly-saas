// Contenido del "Asistente de Revly" (V1 sin IA).
// Preguntas, respuestas y recursos asociados, desacoplados del componente visual.

// Bucket de Supabase Storage donde se alojarán los vídeos de ayuda.
// En la V1 todavía no hay vídeos subidos: la arquitectura queda lista para
// cuando existan. No se guarda nada en PostgreSQL.
export const HELP_VIDEO_BUCKET = 'help-videos';

// Construye la URL pública de un vídeo de ayuda en Supabase Storage.
// Devuelve cadena vacía si no hay URL de Supabase configurada.
export function helpVideoUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return '';
  return `${base}/storage/v1/object/public/${HELP_VIDEO_BUCKET}/${path}`;
}

export type LandingHelpTopic = {
  id: string;
  emoji: string;
  title: string;
  answer: string;
  // Ruta del vídeo dentro del bucket de Supabase Storage (opcional).
  // Si no existe, el asistente funciona únicamente con texto.
  videoPath?: string;
  imageUrl?: string;
  // Enlace opcional (CTA) que se muestra al final de la respuesta.
  linkUrl?: string;
  linkLabel?: string;
};

export const landingHelpTopics: LandingHelpTopic[] = [
  {
    id: 'how-it-works',
    emoji: '⭐',
    title: '¿Cómo funciona Revly?',
    answer:
      'Revly te ayuda a gestionar la reputación de tu negocio desde un único lugar. Puedes facilitar a tus clientes el acceso para dejar sus reseñas y comentarios, centralizar las opiniones que recibes y responderlas fácilmente. Además, puedes analizar lo que opinan tus clientes con Smart Analytics y utilizar IA para ayudarte a redactar respuestas. Puedes generar un QR para facilitar que tus clientes accedan a tu página de reseñas y gestionar todo desde un único panel.',
  },
  {
    id: 'connect-google',
    emoji: '🔗',
    title: '¿Cómo conecto Google?',
    answer:
      'Conecta tu perfil de Google Business con Revly en unos pocos pasos. Solo tienes que autorizar el acceso a tu cuenta de Google y Revly podrá sincronizar la información y las reseñas de tu negocio para que puedas gestionarlas desde un mismo lugar.',
  },
  {
    id: 'manage-reviews',
    emoji: '⭐',
    title: '¿Cómo gestiono mis reseñas?',
    answer:
      'Desde Revly puedes consultar y gestionar las reseñas y comentarios de tu negocio desde un único panel. Puedes leerlos, responderlos y utilizar herramientas de análisis para detectar tendencias, puntos fuertes y aspectos que pueden mejorarse. Revly centraliza la gestión de las opiniones y comentarios de las plataformas que tienes conectadas, para que no tengas que ir cambiando de una aplicación a otra.',
  },
  {
    id: 'smart-analytics',
    emoji: '📊',
    title: '¿Qué son las Smart Analytics?',
    answer:
      'Smart Analytics analiza automáticamente las opiniones de tus clientes para detectar tendencias, temas frecuentes, puntos fuertes y aspectos a mejorar. Así puedes entender mejor qué está funcionando y qué puedes mejorar en tu negocio. También puedes analizar el sentimiento, las valoraciones y los temas más frecuentes de las reseñas.',
  },
  {
    id: 'ai-replies',
    emoji: '🤖',
    title: '¿Cómo funcionan las respuestas con IA?',
    answer:
      'Revly utiliza IA para ayudarte a redactar respuestas profesionales y personalizadas para cada reseña o comentario. Tú revisas la propuesta, la editas si quieres y decides cuándo enviarla.',
  },
  {
    id: 'loyalty',
    emoji: '🎁',
    title: '¿Cómo funciona el programa de fidelización?',
    answer:
      'Puedes crear un programa de fidelización para premiar la frecuencia de tus clientes. El QR del negocio permite a tus clientes registrarse y, una vez registrados, cada cliente dispone de un QR personal que el equipo puede escanear para gestionar sus puntos y recompensas. El programa de puntos es independiente de las reseñas.',
  },
  {
    id: 'social',
    emoji: '📱',
    title: '¿Puedo conectar Facebook e Instagram?',
    answer:
      'Sí. Puedes conectar tus cuentas de Facebook e Instagram para gestionar desde Revly los comentarios y mensajes que recibes, junto con el resto de canales que tengas conectados.',
  },
  {
    id: 'pricing',
    emoji: '💳',
    title: '¿Qué planes tiene Revly?',
    answer: `Revly tiene tres planes:

🆓 Básico
0 €/mes
Ideal para empezar y gestionar un negocio.

⭐ Avanzado
9 €/mes
Más herramientas de gestión y automatización.

🚀 Pro
19 €/mes
Todas las herramientas para negocios que necesitan más capacidad.`,
    linkUrl: '/pricing',
    linkLabel: 'Ver planes y precios →',
  },
  {
    id: 'whats-included',
    emoji: '❓',
    title: '¿Qué incluye Revly?',
    answer:
      'Revly reúne en un solo lugar la gestión de reseñas y comentarios, respuestas con IA, Smart Analytics, programa de fidelización y conexión con Google, Facebook e Instagram. También puedes gestionar clientes, puntos y recompensas desde el mismo panel. Puedes empezar gratis y ampliar tu plan cuando necesites más funcionalidades.',
  },
];
