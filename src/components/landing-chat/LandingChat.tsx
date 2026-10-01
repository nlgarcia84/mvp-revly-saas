'use client';

// "Asistente de Revly" (V1 sin IA): botón flotante que abre un panel de chat.
// El visitante elige preguntas predefinidas y recibe respuestas estáticas.
// No hay llamadas al backend, ni a Groq, ni a Prisma.

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, MessageCircle, X } from 'lucide-react';
import {
  helpVideoUrl,
  type LandingHelpTopic,
} from '@/lib/landing-help';
import ChatMessage from './ChatMessage';
import ChatOptions from './ChatOptions';
import VideoHelp from './VideoHelp';

type Message = {
  id: number;
  role: 'user' | 'assistant';
  text: string;
  videoUrl?: string;
  linkUrl?: string;
  linkLabel?: string;
};

const WELCOME_MESSAGE: Message = {
  id: 0,
  role: 'assistant',
  text: '¡Hola! 👋 Soy el asistente de Revly. Elige una pregunta y te explico cómo funciona.',
};

const LandingChat = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);

  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const nextIdRef = useRef(1);

  // Desplaza únicamente el contenedor interno de mensajes (nunca la página).
  const scrollMessagesToBottom = useCallback(() => {
    const container = messagesContainerRef.current;
    if (container) container.scrollTop = container.scrollHeight;
  }, []);

  // Al abrir, lleva el foco al botón de cerrar y posiciona el scroll al final.
  useEffect(() => {
    if (open) {
      closeButtonRef.current?.focus();
      scrollMessagesToBottom();
    }
  }, [open, scrollMessagesToBottom]);

  // Cierra con la tecla Escape.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  // Al añadir una respuesta, hace scroll del contenedor interno de mensajes
  // hasta el final para mostrar la nueva respuesta (la respuesta queda
  // renderizada y visible, no se oculta).
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  const handleSelect = (topic: LandingHelpTopic) => {
    const videoUrl = topic.videoPath
      ? helpVideoUrl(topic.videoPath)
      : undefined;

    setSelectedTopicId(topic.id);
    const userMessageId = nextIdRef.current++;
    const assistantMessageId = nextIdRef.current++;
    setMessages((prev) => [
      ...prev,
      { id: userMessageId, role: 'user', text: topic.title },
      {
        id: assistantMessageId,
        role: 'assistant',
        text: topic.answer,
        videoUrl,
        linkUrl: topic.linkUrl,
        linkLabel: topic.linkLabel,
      },
    ]);
  };

  const handleBackToOptions = () => {
    setSelectedTopicId(null);
  };

  return (
    <>
      {/* Botón flotante */}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={open ? 'Cerrar asistente' : 'Abrir asistente de ayuda'}
        className="fixed bottom-4 right-4 z-50 inline-flex items-center gap-2 rounded-full border border-stone-200 bg-neutral-950 px-4 py-3 text-sm font-medium text-white shadow-lg transition-all hover:bg-neutral-800 dark:border-neutral-700 dark:bg-neutral-100 dark:text-neutral-950 dark:hover:bg-neutral-300 sm:bottom-6 sm:right-6"
      >
        <MessageCircle className="h-5 w-5" aria-hidden="true" />
        <span className="hidden sm:inline">¿Necesitas ayuda?</span>
      </button>

      {/* Panel de chat */}
      {open && (
        <div
          role="dialog"
          aria-modal="false"
          aria-label="Asistente de Revly"
          className="animate-fade-slide-in fixed bottom-20 right-3 z-50 flex h-[70vh] max-h-[calc(100dvh-6rem)] w-[calc(100vw-24px)] flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-900 sm:bottom-24 sm:right-6 sm:h-[560px] sm:max-h-[calc(100dvh-7rem)] sm:w-[420px] sm:max-w-[calc(100vw-32px)]"
        >
          {/* Cabecera */}
          <header className="flex shrink-0 items-center justify-between border-b border-stone-200 bg-stone-50 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-950 text-white dark:bg-neutral-100 dark:text-neutral-950">
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="text-sm font-semibold text-neutral-950 dark:text-neutral-100">
                Asistente de Revly
              </span>
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Cerrar asistente"
              className="rounded-md p-1.5 text-neutral-500 transition-colors hover:bg-stone-200 hover:text-neutral-950 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </header>

          {/* Mensajes: única zona con scroll vertical */}
          <div
            ref={messagesContainerRef}
            className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overflow-x-hidden px-4 py-4"
            aria-live="polite"
          >
            {messages.map((message) => (
              <ChatMessage key={message.id} role={message.role}>
                <span className="whitespace-pre-line break-words">{message.text}</span>
                {message.role === 'assistant' && message.linkUrl && (
                  <a
                    href={message.linkUrl}
                    className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-neutral-950 underline underline-offset-2 transition-colors hover:text-neutral-600 dark:text-neutral-100 dark:hover:text-neutral-300"
                  >
                    {message.linkLabel ?? message.linkUrl}
                  </a>
                )}
                {message.role === 'assistant' && message.videoUrl && (
                  <VideoHelp
                    videoUrl={message.videoUrl}
                    title={message.text}
                  />
                )}
              </ChatMessage>
            ))}
          </div>

          {/* Opciones / volver a preguntas frecuentes */}
          <div className="shrink-0 border-t border-stone-200 bg-stone-50 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900">
            {selectedTopicId === null ? (
              <>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                  Preguntas frecuentes
                </p>
                <ChatOptions onSelect={handleSelect} />
              </>
            ) : (
              <button
                type="button"
                onClick={handleBackToOptions}
                className="inline-flex items-center gap-2 rounded-lg border border-stone-200 px-3 py-2 text-sm font-medium text-stone-700 transition-colors hover:border-neutral-950 hover:bg-stone-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:border-neutral-500 dark:hover:bg-neutral-700"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Volver a preguntas frecuentes
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default LandingChat;
