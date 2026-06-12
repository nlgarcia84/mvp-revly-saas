import Button from '@/components/ui/button';
import DarkToggle from '@/components/ui/dark-toggle';

const HomePage = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="h-14 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between px-4 sm:px-6 bg-white dark:bg-neutral-950 transition-colors">
        <span className="font-semibold text-xl sm:text-2xl">Revly</span>
        <div className="flex items-center gap-2 sm:gap-3">
          <DarkToggle />
          <Button
            as="link"
            variant="secondary"
            href="/sign-in"
            className="px-3 sm:px-4.5 py-2 text-xs sm:text-sm"
          >
            Iniciar sesión
          </Button>
          <Button
            as="link"
            variant="primary"
            href="/sign-up"
            className="px-3 sm:px-4.5 py-2 text-xs sm:text-sm"
          >
            Registrarse
          </Button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-[90%] sm:max-w-xl lg:max-w-3xl text-center">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.1] mb-4">
            Gestiona la voz de tus clientes
          </h1>
          <p className="text-sm sm:text-base lg:text-lg text-neutral-500 leading-relaxed mb-8">
            Ayuda a tu negocio a conseguir reseñas en Google de forma
            automática. Solicitudes personalizadas, seguimiento simple y más
            visibilidad online.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              as="link"
              variant="primary"
              href="/sign-up"
              className="px-6 sm:px-7 py-3 text-sm sm:text-base"
            >
              Comenzar gratis
            </Button>
            <Button
              as="link"
              variant="secondary"
              href="/sign-in"
              className="px-6 sm:px-7 py-3 text-sm sm:text-base"
            >
              Iniciar sesión
            </Button>
          </div>
        </div>
      </main>

      <footer className="border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 transition-colors">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12 lg:py-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-10 sm:gap-12">
            <div>
              <span className="font-semibold text-lg">Revly</span>
              <p className="text-sm text-neutral-500 mt-2 leading-relaxed max-w-sm">
                La forma más inteligente de gestionar y hacer crecer la reputación online de tu negocio.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-8">
              <div>
                <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-4">Producto</h4>
                <ul className="flex flex-col gap-3">
                  <li>
                    <a href="/sign-up" className="text-sm text-neutral-500 hover:text-neutral-950 dark:hover:text-neutral-100 transition-colors">
                      Comenzar gratis
                    </a>
                  </li>
                  <li>
                    <a href="/sign-in" className="text-sm text-neutral-500 hover:text-neutral-950 dark:hover:text-neutral-100 transition-colors">
                      Iniciar sesión
                    </a>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-4">Legal</h4>
                <ul className="flex flex-col gap-3">
                  <li>
                    <a href="/privacidad" className="text-sm text-neutral-500 hover:text-neutral-950 dark:hover:text-neutral-100 transition-colors">
                      Política de privacidad
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        <div className="border-t border-neutral-200 dark:border-neutral-800 py-5 px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-center gap-4">
          <p className="text-xs text-neutral-400">
            &copy; {new Date().getFullYear()} Revly. Todos los derechos reservados.
          </p>
          <span className="hidden sm:block text-neutral-300 dark:text-neutral-700">·</span>
          <div className="flex items-center gap-2.5" aria-label="Métodos de pago aceptados">
            <svg viewBox="0 0 50 32" className="h-8 w-auto">
              <rect rx="4" className="fill-neutral-300 dark:fill-neutral-600" width="50" height="32" />
              <text x="25" y="21" textAnchor="middle" className="fill-neutral-500 text-[11px] font-bold" fontFamily="sans-serif">VISA</text>
            </svg>
            <svg viewBox="0 0 50 32" className="h-8 w-auto">
              <rect rx="4" className="fill-neutral-300 dark:fill-neutral-600" width="50" height="32" />
              <text x="25" y="21" textAnchor="middle" className="fill-neutral-500 text-[9px] font-bold" fontFamily="sans-serif">Stripe</text>
            </svg>
            <svg viewBox="0 0 50 32" className="h-8 w-auto">
              <rect rx="4" className="fill-neutral-300 dark:fill-neutral-600" width="50" height="32" />
              <text x="25" y="21" textAnchor="middle" className="fill-neutral-500 text-[10px] font-bold" fontFamily="sans-serif">PayPal</text>
            </svg>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
