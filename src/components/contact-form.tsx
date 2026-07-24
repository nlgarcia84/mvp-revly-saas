'use client';

import { useRef, useState } from 'react';
import { Mail, Phone, Send } from 'lucide-react';

type ContactFormProps = {
  initialSuccess?: boolean;
  initialError?: boolean;
};

export default function ContactForm({ initialSuccess = false, initialError = false }: ContactFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const messageRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  });

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = formRef.current;
    if (!form) return;

    setIsSubmitting(true);
    setStatus('idle');

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        body: new FormData(form),
        headers: {
          Accept: 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
      });

      if (response.redirected && response.url) {
        window.location.assign(response.url);
        return;
      }

      if (!response.ok) {
        throw new Error('Error al enviar');
      }

      setStatus('success');
      setFormData({ name: '', email: '', message: '' });
      requestAnimationFrame(() => {
        messageRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
      });
    } catch (error) {
      console.error(error);
      setStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const success = initialSuccess || status === 'success';
  const error = initialError || status === 'error';

  return (
    <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="text-lg font-semibold">Datos de contacto</h2>
        <div className="mt-5 space-y-4 text-sm text-neutral-600 dark:text-neutral-400">
          <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-950">
            <Mail className="h-4 w-4" />
            <span>hello@revly.es</span>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-200/60 p-3 dark:border-neutral-800 dark:bg-neutral-950">
            <Phone className="h-4 w-4" />
            <span>+34 900 123 456</span>
          </div>
        </div>
        <p className="mt-5 text-sm leading-7 text-neutral-600 dark:text-neutral-400">
          También puedes escribirnos a través del formulario si prefieres una consulta más específica sobre producto, integraciones o precios.
        </p>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div ref={messageRef}>
          {success && (
            <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300" aria-live="polite">
              Tu mensaje se ha enviado correctamente. Gracias por contactar con nosotros.
            </div>
          )}
          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300" aria-live="assertive">
              No se ha podido enviar el mensaje. Inténtalo de nuevo en unos minutos.
            </div>
          )}
        </div>
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="mb-2 block text-sm font-medium text-neutral-900 dark:text-neutral-100">Nombre</label>
            <input
              id="name"
              name="name"
              type="text"
              placeholder="Tu nombre"
              value={formData.name}
              onChange={(event) => setFormData({ ...formData, name: event.target.value })}
              className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm outline-none transition focus:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-950"
              required
            />
          </div>
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium text-neutral-900 dark:text-neutral-100">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="tu@email.com"
              value={formData.email}
              onChange={(event) => setFormData({ ...formData, email: event.target.value })}
              className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm outline-none transition focus:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-950"
              required
            />
          </div>
          <div>
            <label htmlFor="message" className="mb-2 block text-sm font-medium text-neutral-900 dark:text-neutral-100">Tu duda</label>
            <textarea
              id="message"
              name="message"
              rows={5}
              placeholder="Cuéntanos qué necesitas..."
              value={formData.message}
              onChange={(event) => setFormData({ ...formData, message: event.target.value })}
              className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm outline-none transition focus:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-950"
              required
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-neutral-950 bg-neutral-950 px-[18px] py-2.5 text-sm font-medium text-white transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isSubmitting}
          >
            <Send className="h-4 w-4" />
            {isSubmitting ? 'Enviando...' : 'Enviar mensaje'}
          </button>
        </form>
      </div>
    </div>
  );
}
