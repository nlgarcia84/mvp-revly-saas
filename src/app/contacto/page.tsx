import BackButton from '@/components/back-button';
import ContactForm from '@/components/contact-form';

const ContactPage = async ({ searchParams }: { searchParams: Promise<{ success?: string; error?: string } | undefined> }) => {
  const resolvedSearchParams = await searchParams;
  const success = Boolean(resolvedSearchParams?.success);
  const error = Boolean(resolvedSearchParams?.error);

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

        <ContactForm initialSuccess={success} initialError={error} />
      </div>
    </div>
  );
};

export default ContactPage;
