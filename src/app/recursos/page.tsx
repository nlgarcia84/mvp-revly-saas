import BackButton from '@/components/back-button';
import { BookOpen, HelpCircle, Search } from 'lucide-react';

const faqs = [
  {
    question: '¿Cómo conectar Google Business?',
    answer:
      'Entra en el panel de tu negocio, ve a Integraciones y conecta tu perfil de Google Business para empezar a gestionar reseñas y publicaciones desde Revly.',
  },
  {
    question: '¿Cómo crear un programa de puntos?',
    answer:
      'Puedes activar recompensas desde la sección de programas del dashboard y definir reglas simples para premiar a tus clientes por compras o visitas.',
  },
  {
    question: '¿Cómo importar reseñas?',
    answer:
      'Revly te permite centralizar reseñas existentes y organizarlas para responder desde un único lugar, mejorando tu gestión de reputación.',
  },
];

const resourceCards = [
  {
    title: 'Centro de ayuda',
    description: 'Guías rápidas y respuestas para resolver dudas frecuentes sobre Revly.',
    icon: HelpCircle,
    href: '/recursos#ayuda',
  },
  {
    title: 'Blog',
    description: 'Consejos para mejorar tu reputación online y convertir reseñas en negocio.',
    icon: BookOpen,
    href: '/blog',
  },
];

const ResourcesPage = () => {
  return (
    <div className="min-h-screen bg-neutral-50 px-4 py-10 text-neutral-950 transition-colors dark:bg-neutral-950 dark:text-neutral-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 sm:p-8">
          <BackButton href="/producto" />
          <h1 className="mt-6 text-3xl font-semibold tracking-tight sm:text-4xl">Recursos</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-neutral-600 dark:text-neutral-400">
            Accede a ayuda, consejos y soporte para sacar el máximo partido a Revly y a tu estrategia de reputación online.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {resourceCards.map((card) => {
            const Icon = card.icon;
            return (
              <a
                key={card.title}
                href={card.href}
                className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition-colors hover:border-neutral-400 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700 dark:hover:bg-neutral-950"
              >
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Icon className="h-4 w-4" />
                  {card.title}
                </div>
                <p className="mt-2 text-sm leading-6 text-neutral-600 dark:text-neutral-400">
                  {card.description}
                </p>
              </a>
            );
          })}
        </div>

        <div id="ayuda" className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <HelpCircle className="h-5 w-5" />
            Centro de ayuda
          </div>

          <div className="mt-4 flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 dark:border-neutral-800 dark:bg-neutral-950">
            <Search className="h-4 w-4 text-neutral-500" />
            <input
              type="text"
              placeholder="Buscar..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-400"
            />
          </div>

          <div className="mt-5 space-y-3">
            {faqs.map((faq) => (
              <div key={faq.question} className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-950">
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{faq.question}</p>
                <p className="mt-2 text-sm leading-6 text-neutral-600 dark:text-neutral-400">{faq.answer}</p>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
};

export default ResourcesPage;
