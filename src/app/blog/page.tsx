import BackButton from '@/components/back-button';
import { BookOpen } from 'lucide-react';

const posts = [
  {
    title: 'Cómo conseguir más reseñas con menos esfuerzo',
    description: 'Descubre cómo automatizar la captación de reseñas sin perder naturalidad en la experiencia del cliente.',
  },
  {
    title: 'Google Business y reputación online',
    description: 'Aprende a aprovechar tu perfil de Google Business para ganar más confianza y visibilidad.',
  },
  {
    title: 'La IA también mejora la atención al cliente',
    description: 'Conoce cómo responder a reseñas de forma más rápida y consistente con ayuda de inteligencia artificial.',
  },
];

const BlogPage = () => {
  return (
    <div className="min-h-screen bg-neutral-50 px-4 py-10 text-neutral-950 transition-colors dark:bg-neutral-950 dark:text-neutral-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 sm:p-8">
          <BackButton href="/recursos" />
          <div className="mt-6 flex items-center gap-2 text-lg font-semibold">
            <BookOpen className="h-5 w-5" />
            Blog
          </div>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-neutral-600 dark:text-neutral-400">
            Ideas, consejos y recursos para mejorar tu reputación online y convertir cada interacción en una oportunidad de crecimiento.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {posts.map((post) => (
            <div key={post.title} className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <h2 className="text-base font-semibold">{post.title}</h2>
              <p className="mt-2 text-sm leading-6 text-neutral-600 dark:text-neutral-400">{post.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BlogPage;
