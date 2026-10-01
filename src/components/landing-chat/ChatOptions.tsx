// Lista de opciones (preguntas) que el visitante puede elegir en el chat.
// Sin interpretación de lenguaje natural: cada opción es un botón con una
// respuesta predefinida asociada.

import {
  landingHelpTopics,
  type LandingHelpTopic,
} from '@/lib/landing-help';

type ChatOptionsProps = {
  onSelect: (topic: LandingHelpTopic) => void;
};

const ChatOptions = ({ onSelect }: ChatOptionsProps) => (
  <div
    role="group"
    aria-label="Preguntas frecuentes"
    className="flex flex-col gap-2"
  >
    {landingHelpTopics.map((topic) => (
      <button
        key={topic.id}
        type="button"
        onClick={() => onSelect(topic)}
        className="w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-left text-sm text-stone-700 transition-colors hover:border-neutral-950 hover:bg-stone-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:border-neutral-500 dark:hover:bg-neutral-700"
      >
        <span aria-hidden="true" className="mr-2">
          {topic.emoji}
        </span>
        {topic.title}
      </button>
    ))}
  </div>
);

export default ChatOptions;
