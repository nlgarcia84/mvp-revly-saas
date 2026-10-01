// Burbuja de mensaje del asistente. `role="user"` se alinea a la derecha
// (el visitante) y `role="assistant"` a la izquierda (Revly).

type ChatMessageProps = {
  role: 'user' | 'assistant';
  children: React.ReactNode;
};

const ChatMessage = ({ role, children }: ChatMessageProps) => {
  const isUser = role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] min-w-0 break-words rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? 'rounded-br-md bg-neutral-950 text-white dark:bg-neutral-100 dark:text-neutral-950'
            : 'rounded-bl-md bg-stone-100 text-stone-800 dark:bg-neutral-800 dark:text-neutral-200'
        }`}
      >
        {children}
      </div>
    </div>
  );
};

export default ChatMessage;
