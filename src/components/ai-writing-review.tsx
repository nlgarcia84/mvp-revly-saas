'use client';

import { useState, useEffect, useCallback } from 'react';

const examples = [
  {
    initials: 'JM',
    name: 'Juan M.',
    review: 'Mala experiencia. El pedido llegó tarde y la comunicación fue pésima. No volveré.',
    stars: 1,
    reply:
      'Hola Juan, gracias por tu feedback. Lamentamos mucho lo ocurrido y ya hemos hablado con el equipo para que no vuelva a suceder. Nos encantaría darte una compensación en tu próxima visita.',
  },
  {
    initials: 'AL',
    name: 'Ana L.',
    review: 'El trato recibido fue decepcionante. No resolvieron mi incidencia y encima tardaron una semana en responderme.',
    stars: 2,
    reply:
      'Hola Ana, sentimos mucho tu experiencia. Hemos revisado tu caso y ya hemos tomado medidas para agilizar los tiempos de respuesta. Un responsable se pondrá en contacto contigo personalmente.',
  },
  {
    initials: 'CP',
    name: 'Carlos P.',
    review: 'Pésima atención al cliente. Me ignoraron completamente cuando fui a reclamar. No lo recomiendo.',
    stars: 1,
    reply:
      'Carlos, gracias por sincerarte. Lo que nos cuentas no refleja el servicio que queremos ofrecer. Ya estamos formando al equipo para garantizar una atención excelente. Esperamos tener otra oportunidad.',
  },
  {
    initials: 'MR',
    name: 'María R.',
    review: 'La calidad del servicio ha bajado mucho. Antes era mejor. No sé si volveré.',
    stars: 2,
    reply:
      'María, gracias por ser honesta. Tomamos muy en serio tu opinión y ya estamos revisando nuestros procesos para recuperar la calidad que nos caracterizaba. Nos encantaría verte de nuevo pronto.',
  },
];

const DeadFace = () => (
  <svg
    viewBox="0 0 100 100"
    className="w-20 h-20 sm:w-24 sm:h-24 text-white"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {/* Cabeza */}
    <circle cx="50" cy="50" r="45" />

    {/* Ojo izquierdo - X animada */}
    <g className="animate-cross-spin" style={{ transformOrigin: '35px 38px' }}>
      <line x1="27" y1="30" x2="43" y2="46" />
      <line x1="43" y1="30" x2="27" y2="46" />
    </g>

    {/* Ojo derecho - X animada en direccion opuesta */}
    <g className="animate-cross-spin-reverse" style={{ transformOrigin: '65px 38px' }}>
      <line x1="57" y1="30" x2="73" y2="46" />
      <line x1="73" y1="30" x2="57" y2="46" />
    </g>

    {/* Boca - fruncida */}
    <path d="M32 70 Q50 60 68 70" />
  </svg>
);

const AiWritingReview = () => {
  const [phase, setPhase] = useState<'text-in' | 'icon-in' | 'text-out' | 'card-in' | 'animating'>('text-in');
  const [current, setCurrent] = useState(0);
  const [typingPhase, setTypingPhase] = useState<'typing-review' | 'typing-reply' | 'done'>('typing-review');
  const [reviewText, setReviewText] = useState('');
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    if (phase !== 'text-in') return;
    const t = setTimeout(() => setPhase('icon-in'), 2000);
    return () => clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'icon-in') return;
    const t = setTimeout(() => setPhase('text-out'), 2500);
    return () => clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'text-out') return;
    const t = setTimeout(() => setPhase('card-in'), 600);
    return () => clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'card-in') return;
    const t = setTimeout(() => setPhase('animating'), 500);
    return () => clearTimeout(t);
  }, [phase]);

  const reset = useCallback((index: number) => {
    setCurrent(index);
    setTypingPhase('typing-review');
    setReviewText('');
    setReplyText('');
  }, []);

  useEffect(() => {
    if (phase !== 'animating') return;

    if (typingPhase === 'typing-review') {
      let i = 0;
      const interval = setInterval(() => {
        i++;
        setReviewText(examples[current].review.slice(0, i));
        if (i >= examples[current].review.length) {
          clearInterval(interval);
          setTimeout(() => setTypingPhase('typing-reply'), 500);
        }
      }, 20);
      return () => clearInterval(interval);
    }
  }, [typingPhase, current, phase]);

  useEffect(() => {
    if (phase !== 'animating') return;

    if (typingPhase === 'typing-reply') {
      let i = 0;
      const interval = setInterval(() => {
        i++;
        setReplyText(examples[current].reply.slice(0, i));
        if (i >= examples[current].reply.length) {
          clearInterval(interval);
          setTypingPhase('done');
        }
      }, 15);
      return () => clearInterval(interval);
    }
  }, [typingPhase, current, phase]);

  useEffect(() => {
    if (typingPhase === 'done' && phase === 'animating') {
      const timeout = setTimeout(() => {
        reset((current + 1) % examples.length);
      }, 2500);
      return () => clearTimeout(timeout);
    }
  }, [typingPhase, current, phase, reset]);

  const ex = examples[current];
  const isTextVisible = phase === 'text-in' || phase === 'icon-in';

  return (
    <div className="w-full max-w-sm mx-auto mt-12 h-[560px] flex flex-col items-center justify-center">
      {/* Pregunta */}
      <p
        className={`text-xl sm:text-2xl font-bold text-center mb-4 transition-all duration-700 ease-in-out ${
          isTextVisible
            ? 'opacity-100 text-white translate-y-0 scale-100'
            : 'opacity-0 -translate-y-4 scale-95 text-white hidden'
        }`}
        style={{ fontFamily: 'var(--font-geist-sans), system-ui, sans-serif' }}
      >
        ¿Te da pereza contestar?
      </p>

      {/* Cara grande con ojos en cruz animados */}
      <div
        className={`transition-all duration-700 ease-in-out ${
          phase === 'icon-in'
            ? 'opacity-100 scale-100 translate-y-0'
            : phase === 'text-in'
              ? 'opacity-0 scale-50 translate-y-4'
              : 'opacity-0 scale-75 translate-y-4 hidden'
        }`}
      >
        <DeadFace />
      </div>

      {/* Animación de reseñas */}
      <div
        className={`w-full rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-lg p-5 transition-all duration-500 ease-out ${
          phase === 'text-in' || phase === 'icon-in'
            ? 'opacity-0 scale-95 hidden'
            : phase === 'text-out'
              ? 'opacity-0 scale-95 hidden'
              : phase === 'card-in'
                ? 'opacity-100 scale-100'
                : 'opacity-100 scale-100'
        }`}
      >
        {/* Reseña negativa */}
        <div className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/40 p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-full bg-red-200 dark:bg-red-800 flex items-center justify-center text-xs shrink-0">
              ☹️
            </div>
            <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
              {ex.name}
            </span>
            <span className="text-xs text-neutral-400 ml-auto">hoy</span>
          </div>
          <div className="flex mb-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <svg
                key={star}
                className={`w-3.5 h-3.5 ${star <= ex.stars ? 'text-red-400' : 'text-neutral-200 dark:text-neutral-700'}`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>
          <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300 min-h-[2.5rem]">
            {reviewText}
            {typingPhase === 'typing-review' && phase === 'animating' && (
              <span className="inline-block w-[2px] h-3.5 bg-neutral-400 ml-0.5 align-text-bottom animate-pulse" />
            )}
          </p>
        </div>

        {/* Respuesta con IA */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-semibold text-xs shrink-0">
            IA
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                Revly AI
              </span>
              {typingPhase !== 'typing-review' && phase === 'animating' && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-medium">
                  {typingPhase === 'done' ? 'Respondida' : 'Escribiendo...'}
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-400">Respuesta automática</p>
          </div>
        </div>

        {typingPhase !== 'typing-review' && phase === 'animating' && (
          <div className="rounded-xl bg-neutral-50 dark:bg-neutral-800/50 p-4">
            <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300 min-h-[3rem]">
              {replyText}
              {typingPhase === 'typing-reply' && (
                <span className="inline-block w-[2px] h-3.5 bg-neutral-950 dark:bg-neutral-100 ml-0.5 align-text-bottom animate-pulse" />
              )}
            </p>
          </div>
        )}

        {typingPhase === 'done' && phase === 'animating' && (
          <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 animate-fade-slide-in">
            <span>😊</span>
            Reseña respondida automáticamente con IA
          </div>
        )}
      </div>
    </div>
  );
};

export default AiWritingReview;
