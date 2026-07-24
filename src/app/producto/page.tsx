import BackButton from '@/components/back-button';
import Button from '@/components/ui/button';
import {
  ArrowRight,
  BadgeDollarSign,
  CheckCircle2,
  Globe2,
  Sparkles,
} from 'lucide-react';

const productSections = [
  {
    title: 'Funcionalidades',
    icon: Sparkles,
    description:
      'Gestiona reseñas, responde con IA y convierte cada interacción en una oportunidad de crecimiento.',
    bullets: [
      'Solicitudes automáticas por QR, email y factura.',
      'Respuestas inteligentes a reseñas en segundos.',
      'Panel simple para supervisar el rendimiento y la reputación.',
    ],
  },
  {
    title: 'Integraciones',
    icon: Globe2,
    description:
      'Conecta Revly con Google Business para fortalecer tu presencia online con menos fricción.',
    bullets: [
      'Sincronización con Google Business Profile.',
      'Centraliza la gestión de reseñas y publicaciones.',
      'Mejora la confianza del cliente en cada punto de contacto.',
    ],
  },
  {
    title: 'Precios',
    icon: BadgeDollarSign,
    description:
      'Empieza gratis y escala sin complicaciones cuando tu negocio crece.',
    bullets: [
      'Plan gratuito para empezar a recoger reseñas.',
      'Funciones premium para automatizar y escalar.',
      'Pagos transparentes y sin contratos largos.',
    ],
  },
  {
    title: 'Comenzar gratis',
    icon: ArrowRight,
    description:
      'Abre tu cuenta en minutos y empieza a transformar tus opiniones en crecimiento real.',
    bullets: [
      'Registro rápido y sin complicaciones.',
      'Tu primer flujo de reseñas listo en pocos minutos.',
      'Acceso inmediato al panel y a la experiencia principal.',
    ],
  },
];

const ProductPage = () => {
  return (
    <div className="min-h-screen bg-neutral-50 px-4 py-10 text-neutral-950 transition-colors dark:bg-neutral-950 dark:text-neutral-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 sm:p-8">
          <BackButton href="/" />

          <div className="mt-6 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div className="max-w-2xl">
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-neutral-500 dark:text-neutral-400">
                Producto
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                Una forma más sencilla de captar reseñas y fortalecer tu marca.
              </h1>
              <p className="mt-4 text-base leading-7 text-neutral-600 dark:text-neutral-400">
                Revly combina automatización, inteligencia artificial y herramientas de reputación para que cada cliente satisfecho se convierta en una reseña valiosa.
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5 dark:border-neutral-800 dark:bg-neutral-950">
              <div className="flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                <CheckCircle2 className="h-4 w-4" />
                Más reseñas, menos esfuerzo
              </div>
              <p className="mt-3 text-sm leading-6 text-neutral-600 dark:text-neutral-400">
                Diseñado para negocios que quieren dejar atrás los procesos manuales y mejorar su presencia en Google con una experiencia clara y elegante.
              </p>
              <Button as="link" href="/sign-up" variant="primary" className="mt-5 px-4 py-2.5">
                Crear cuenta gratuita
              </Button>
            </div>
          </div>
        </div>

        <section className="grid gap-4 md:grid-cols-2">
          {productSections.map((section) => {
            const Icon = section.icon;

            return (
              <article
                key={section.title}
                className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-full border border-neutral-200 bg-neutral-50 p-2 dark:border-neutral-800 dark:bg-neutral-950">
                    <Icon className="h-4 w-4" />
                  </div>
                  <h2 className="text-lg font-semibold">{section.title}</h2>
                </div>
                <p className="mt-4 text-sm leading-6 text-neutral-600 dark:text-neutral-400">
                  {section.description}
                </p>
                <ul className="mt-4 space-y-2 text-sm text-neutral-700 dark:text-neutral-300">
                  {section.bullets.map((bullet) => (
                    <li key={bullet} className="flex gap-2">
                      <span className="mt-1 h-2.5 w-2.5 rounded-full bg-neutral-900 dark:bg-neutral-100" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <h2 className="text-xl font-semibold">Recursos</h2>
            <p className="mt-3 text-sm leading-6 text-neutral-600 dark:text-neutral-400">
              Encuentra guías, preguntas frecuentes y ayuda para sacar el máximo partido a Revly.
            </p>
            <Button as="link" href="/recursos" variant="primary" className="mt-5 px-4 py-2.5">
              Ver recursos
            </Button>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <h2 className="text-xl font-semibold">Legal</h2>
            <p className="mt-3 text-sm leading-6 text-neutral-600 dark:text-neutral-400">
              Consulta la información legal, la política de privacidad y las condiciones de uso del servicio.
            </p>
            <Button as="link" href="/legal" variant="secondary" className="mt-5 px-4 py-2.5">
              Ver información legal
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ProductPage;
