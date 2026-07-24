import BackButton from '@/components/back-button';
import Button from '@/components/ui/button';
import { ShieldCheck } from 'lucide-react';

const legalSections = [
  {
    title: 'Política de privacidad',
    content:
      'Revly protege los datos de los usuarios y utiliza la información facilitada exclusivamente para prestar los servicios contratados, gestionar la relación con el cliente y mejorar la experiencia de uso. Los datos pueden tratarse con proveedores de servicios tecnológicos y plataformas de terceros cuando ello sea necesario para prestar el servicio de forma adecuada y segura.',
  },
  {
    title: 'Términos y condiciones',
    content:
      'El acceso y uso de Revly está sujeto a las condiciones vigentes en cada momento. El usuario debe proporcionar información veraz, utilizar la plataforma conforme a la normativa aplicable y respetar los derechos de terceros, incluidos los proveedores de servicios como Google Business.',
  },
  {
    title: 'Política de cookies',
    content:
      'Este sitio utiliza cookies técnicas, de personalización y de análisis para garantizar el correcto funcionamiento del servicio y mejorar la experiencia del usuario. El usuario puede gestionar sus preferencias desde la configuración de su navegador.',
  },
];

const LegalPage = () => {
  return (
    <div className="min-h-screen bg-neutral-50 px-4 py-10 text-neutral-950 transition-colors dark:bg-neutral-950 dark:text-neutral-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 sm:p-8">
          <BackButton href="/producto" />
          <div className="mt-6 flex items-center gap-2 text-lg font-semibold">
            <ShieldCheck className="h-5 w-5" />
            Información legal
          </div>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-neutral-600 dark:text-neutral-400">
            Aquí puedes consultar la información legal de Revly con un formato claro, breve y alineado con lo habitual en España.
          </p>
        </div>

        <div className="space-y-4">
          {legalSections.map((section) => (
            <div key={section.title} className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <h2 className="text-lg font-semibold">{section.title}</h2>
              <p className="mt-2 text-sm leading-7 text-neutral-600 dark:text-neutral-400">{section.content}</p>
            </div>
          ))}
        </div>

        <Button as="link" href="/privacidad" variant="secondary" className="px-4 py-2.5 self-start">
          Ver política de privacidad
        </Button>
      </div>
    </div>
  );
};

export default LegalPage;
