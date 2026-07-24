import BackButton from '@/components/back-button';
import Button from '@/components/ui/button';
import { Mail, Phone, Send } from 'lucide-react';

const ContactPage = ({ searchParams }: { searchParams?: { success?: string; error?: string } }) => {
  const success = searchParams?.success;
  const error = searchParams?.error;

  return (
    <div className="min-h-screen bg-neutral-50 px-4 py-10 text-neutral-950 transition-colors dark:bg-neutral-950 dark:text-neutral-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 sm:p-8">
          <BackButton href="/recursos" />
          <h1 className="mt-6 text-3xl font-semibold tracking-tight sm:text-4xl">Contacta con nosotros</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-neutral-600 dark:text-neutral-400">
            ¿Tienes dudas, necesitas ayuda o quieres hablar con nuestro equipo? Envíanos un mensaje y te responderemos lo antes posible.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <h2 className="text-lg font-semibold">Datos de contacto</h2>
            <div className="mt-5 space-y-4 text-sm text-neutral-600 dark:text-neutral-400">
              <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-950">
                <Mail className="h-4 w-4" />
                <span>revlyreviwes@gmail.com</span>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-950">
                <Phone className="h-4 w-4" />
                <span>+34 900 123 456</span>
              </div>
            </div>
            <p className="mt-5 text-sm leading-7 text-neutral-600 dark:text-neutral-400">
              También puedes escribirnos a través del formulario si prefieres una consulta más específica sobre producto, integraciones o precios.
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            {success && (
              <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                Tu mensaje se ha enviado correctamente. Gracias por contactar con nosotros.
              </div>
            )}
            {error && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300">
                No se ha podido enviar el mensaje. Inténtalo de nuevo en unos minutos.
              </div>
            )}
            <form action="/api/contact" method="POST" className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-900 dark:text-neutral-100">Nombre</label>
                <input
                  name="name"
                  type="text"
                  placeholder="Tu nombre"
                  className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm outline-none transition focus:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-950"
                  required
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-900 dark:text-neutral-100">Email</label>
                <input
                  name="email"
                  type="email"
                  placeholder="tu@email.com"
                  className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm outline-none transition focus:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-950"
                  required
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-900 dark:text-neutral-100">Tu duda</label>
                <textarea
                  name="message"
                  rows={5}
                  placeholder="Cuéntanos qué necesitas..."
                  className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm outline-none transition focus:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-950"
                  required
                />
              </div>
              <Button as="button" variant="primary" className="px-4 py-2.5">
                <Send className="h-4 w-4" />
                Enviar mensaje
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;
