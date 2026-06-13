import Button from '@/components/ui/button';
import DarkToggle from '@/components/ui/dark-toggle';

// ──────────────────────────────────────────────
// HomePage (Landing)
// ──────────────────────────────────────────────
// Página principal pública con:
//   - Header con logo, dark toggle y botones de auth
//   - Hero section con CTA principal
//   - Footer profesional con columnas (producto, legal),
//     métodos de pago (Visa, Stripe, PayPal) y copyright
// ──────────────────────────────────────────────

const HomePage = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="h-14 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between px-4 sm:px-6 bg-white dark:bg-neutral-950 transition-colors">
        <span className="font-semibold text-xl sm:text-2xl">Revly</span>
        <div className="flex items-center gap-2 sm:gap-3">
          <DarkToggle />
          <Button as="link" variant="secondary" href="/sign-in" className="px-3 sm:px-4.5 py-2 text-xs sm:text-sm">Iniciar sesión</Button>
          <Button as="link" variant="primary" href="/sign-up" className="px-3 sm:px-4.5 py-2 text-xs sm:text-sm">Registrarse</Button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden">
        {/* Video de fondo */}
        <div className="absolute inset-0 -z-10">
          <video
            autoPlay
            muted
            loop
            playsInline
            className="w-full h-full object-cover opacity-20 dark:opacity-10"
          >
            <source src="/videos/mobilevideo.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-b from-white/60 via-white/30 to-white/80 dark:from-neutral-950/50 dark:via-neutral-950/20 dark:to-neutral-950/70" />
        </div>

        <div className="w-full max-w-[90%] sm:max-w-xl lg:max-w-3xl text-center relative z-10">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.1] mb-4">
            Gestiona la voz de tus clientes
          </h1>
          <p className="text-sm sm:text-base lg:text-lg text-neutral-500 leading-relaxed mb-8">
            Ayuda a tu negocio a conseguir reseñas en Google de forma
            automática. Solicitudes personalizadas, seguimiento simple y más
            visibilidad online.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button as="link" variant="primary" href="/sign-up" className="px-6 sm:px-7 py-3 text-sm sm:text-base">Comenzar gratis</Button>
            <Button as="link" variant="secondary" href="/sign-in" className="px-6 sm:px-7 py-3 text-sm sm:text-base">Iniciar sesión</Button>
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
                  <li><a href="/sign-up" className="text-sm text-neutral-500 hover:text-neutral-950 dark:hover:text-neutral-100 transition-colors">Comenzar gratis</a></li>
                  <li><a href="/sign-in" className="text-sm text-neutral-500 hover:text-neutral-950 dark:hover:text-neutral-100 transition-colors">Iniciar sesión</a></li>
                </ul>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-4">Legal</h4>
                <ul className="flex flex-col gap-3">
                  <li><a href="/privacidad" className="text-sm text-neutral-500 hover:text-neutral-950 dark:hover:text-neutral-100 transition-colors">Política de privacidad</a></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        <div className="border-t border-neutral-200 dark:border-neutral-800 py-5 px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-center gap-4">
          <p className="text-xs text-neutral-400">&copy; {new Date().getFullYear()} Revly. Todos los derechos reservados.</p>
          <span className="hidden sm:block text-neutral-300 dark:text-neutral-700">·</span>
          <div className="flex items-center gap-2.5" aria-label="Métodos de pago">
            <svg viewBox="0 0 468 222.5" className="h-7 w-auto">
              <path fill="#635BFF" d="M414,113.4c0-25.6-12.4-45.8-36.1-45.8c-23.8,0-38.2,20.2-38.2,45.6c0,30.1,17,45.3,41.4,45.3 c11.9,0,20.9-2.7,27.7-6.5v-20c-6.8,3.4-14.6,5.5-24.5,5.5c-9.7,0-18.3-3.4-19.4-15.2h48.9C413.8,121,414,115.8,414,113.4z M364.6,103.9c0-11.3,6.9-16,13.2-16c6.1,0,12.6,4.7,12.6,16H364.6z"/>
              <path fill="#635BFF" d="M301.1,67.6c-9.8,0-16.1,4.6-19.6,7.8l-1.3-6.2h-22v116.6l25-5.3l0.1-28.3c3.6,2.6,8.9,6.3,17.7,6.3 c17.9,0,34.2-14.4,34.2-46.1C335.1,83.4,318.6,67.6,301.1,67.6z M295.1,136.5c-5.9,0-9.4-2.1-11.8-4.7l-0.1-37.1 c2.6-2.9,6.2-4.9,11.9-4.9c9.1,0,15.4,10.2,15.4,23.3C310.5,126.5,304.3,136.5,295.1,136.5z"/>
              <polygon fill="#635BFF" points="223.8,61.7 248.9,56.3 248.9,36 223.8,41.3"/>
              <rect x="223.8" y="69.3" fill="#635BFF" width="25.1" height="87.5"/>
              <path fill="#635BFF" d="M196.9,76.7l-1.6-7.4h-21.6v87.5h25V97.5c5.9-7.7,15.9-6.3,19-5.2v-23C214.5,68.1,202.8,65.9,196.9,76.7z"/>
              <path fill="#635BFF" d="M146.9,47.6l-24.4,5.2l-0.1,80.1c0,14.8,11.1,25.7,25.9,25.7c8.2,0,14.2-1.5,17.5-3.3V135 c-3.2,1.3-19,5.9-19-8.9V90.6h19V69.3h-19L146.9,47.6z"/>
              <path fill="#635BFF" d="M79.3,94.7c0-3.9,3.2-5.4,8.5-5.4c7.6,0,17.2,2.3,24.8,6.4V72.2c-8.3-3.3-16.5-4.6-24.8-4.6 C67.5,67.6,54,78.2,54,95.9c0,27.6,38,23.2,38,35.1c0,4.6-4,6.1-9.6,6.1c-8.3,0-18.9-3.4-27.3-8v23.8c9.3,4,18.7,5.7,27.3,5.7 c20.8,0,35.1-10.3,35.1-28.2C117.4,100.6,79.3,105.9,79.3,94.7z"/>
            </svg>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
