import AiWritingReview from "@/components/ai-writing-review";
import MobileMenu from "@/components/mobile-menu";
import Button from "@/components/ui/button";
import DarkToggle from "@/components/ui/dark-toggle";
import LandingCard, {
  LandingCardContent,
  LandingCardDescription,
  LandingCardHeader,
  LandingCardTitle,
} from "@/components/ui/landing-card";
import { Sparkles, Star, TrendingUp } from "lucide-react";

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
      <header className="fixed top-0 left-0 right-0 z-40 border-b border-neutral-800 flex items-center justify-between px-6 py-5 sm:px-10 sm:py-6 bg-black transition-colors">
        <span className="font-semibold text-xl sm:text-2xl text-white">
          Revly
        </span>
        <div className="flex items-center gap-2 sm:gap-3">
          <DarkToggle />
          <MobileMenu />
          <div className="hidden sm:flex items-center gap-2 sm:gap-3">
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
        </div>
      </header>

      <main className="px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28 lg:pt-32 pb-20 relative overflow-hidden bg-neutral-50 dark:bg-neutral-950">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <video
            autoPlay
            muted
            loop
            playsInline
            className="w-full h-full object-cover opacity-25 dark:opacity-12"
          >
            <source src="/videos/mobilevideo.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-linear-to-b from-white/60 via-white/25 to-white/60 dark:from-neutral-950/55 dark:via-neutral-950/15 dark:to-neutral-950/50" />
          <div className="pointer-events-none absolute -top-32 -left-32 h-[42rem] w-[42rem] rounded-full bg-emerald-400/20 dark:bg-emerald-500/15 blur-3xl animate-float-slow" />
          <div
            className="pointer-events-none absolute -bottom-40 -right-32 h-[38rem] w-[38rem] rounded-full bg-indigo-400/20 dark:bg-indigo-500/15 blur-3xl animate-float-slow"
            style={{ animationDelay: "-4.5s" }}
          />
        </div>

        <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col items-center gap-8 md:grid md:grid-cols-2 md:items-center md:gap-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)] lg:items-center lg:gap-12">
          <div className="w-full max-w-[92%] sm:max-w-2xl text-center md:text-left md:max-w-none">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.06] mb-4 text-neutral-950 dark:text-neutral-100 [text-shadow:0_1px_2px_rgba(255,255,255,0.65)] dark:[text-shadow:0_1px_2px_rgba(0,0,0,0.45)]">
              Consigue más reseñas de Google con IA
            </h1>
            <p className="text-sm sm:text-base md:text-lg lg:text-xl text-neutral-600 dark:text-neutral-300 leading-relaxed mb-8 max-w-2xl mx-auto md:mx-0 [text-shadow:0_1px_2px_rgba(255,255,255,0.45)] dark:[text-shadow:0_1px_2px_rgba(0,0,0,0.35)]">
              Automatiza solicitudes de reseña por QR, email y factura. Responde
              con inteligencia artificial y construye una reputación online
              imparable.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
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

          <div className="w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-none mx-auto md:mx-0 md:justify-self-end">
            <AiWritingReview />
          </div>
        </div>
      </main>

      <section className="border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16 lg:py-20">
          <div className="max-w-2xl mb-8 sm:mb-10">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-neutral-950 dark:text-neutral-100">
              Todo lo que necesitas para dominar tu reputación online
            </h2>
            <p className="mt-3 text-sm sm:text-base leading-7 text-neutral-500 dark:text-neutral-400">
              Desde el primer código QR hasta el análisis de reseñas con IA. Una
              plataforma que convierte clientes satisfechos en reseñas de 5
              estrellas.
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <LandingCard>
              <LandingCardHeader>
                <Sparkles className="w-6 h-6 text-black dark:text-white mb-4" />
                <LandingCardTitle>Solicitudes automatizadas</LandingCardTitle>
                <LandingCardDescription>
                  QR, email o factura. Solicita reseñas en el momento justo sin
                  esfuerzo manual.
                </LandingCardDescription>
              </LandingCardHeader>
              <LandingCardContent>
                <p className="text-sm leading-7 text-neutral-600 dark:text-neutral-400">
                  Cada interacción con tu cliente es una oportunidad para
                  conseguir una nueva reseña en Google. Automatiza el proceso y
                  multiplica tus valoraciones sin apenas esfuerzo.
                </p>
              </LandingCardContent>
            </LandingCard>

            <LandingCard>
              <LandingCardHeader>
                <Star className="w-6 h-6 text-black dark:text-white mb-4" />
                <LandingCardTitle>Respuestas con IA</LandingCardTitle>
                <LandingCardDescription>
                  Responde a cada reseña con contexto generado por inteligencia
                  artificial en segundos.
                </LandingCardDescription>
              </LandingCardHeader>
              <LandingCardContent>
                <p className="text-sm leading-7 text-neutral-600 dark:text-neutral-400">
                  Mantén una comunicación activa con todos tus clientes sin
                  invertir horas. La IA redacta respuestas coherentes,
                  profesionales y personalizadas para cada reseña.
                </p>
              </LandingCardContent>
            </LandingCard>

            <LandingCard>
              <LandingCardHeader>
                <TrendingUp className="w-6 h-6 text-black dark:text-white mb-4" />
                <LandingCardTitle>Analítica y crecimiento</LandingCardTitle>
                <LandingCardDescription>
                  Mide, aprende y mejora tu reputación digital con datos claros
                  y accionables.
                </LandingCardDescription>
              </LandingCardHeader>
              <LandingCardContent>
                <p className="text-sm leading-7 text-neutral-600 dark:text-neutral-400">
                  Seguimiento de reseñas, tendencias de puntuación y alertas
                  inteligentes para actuar antes de que un problema escale.
                  Convierte la reputación en tu mejor canal de adquisición.
                </p>
              </LandingCardContent>
            </LandingCard>
          </div>
        </div>
      </section>

      <footer className="border-t border-neutral-200 p-4 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 transition-colors">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12 lg:py-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-10 sm:gap-12">
            <div>
              <span className="font-semibold text-lg">Revly</span>
              <p className="text-sm text-neutral-500 mt-2 leading-relaxed max-w-sm">
                Gestiona tu reputación online con una experiencia más clara y
                eficiente.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-4">
                  Producto
                </h4>
                <ul className="flex flex-col gap-3">
                  <li>
                    <a
                      href="/producto"
                      className="text-sm text-neutral-500 hover:text-neutral-950 dark:hover:text-neutral-100 transition-colors"
                    >
                      Conoce Revly
                    </a>
                  </li>
                  <li>
                    <a
                      href="/sign-up"
                      className="text-sm text-neutral-500 hover:text-neutral-950 dark:hover:text-neutral-100 transition-colors"
                    >
                      Comenzar gratis
                    </a>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-4">
                  Soporte
                </h4>
                <ul className="flex flex-col gap-3">
                  <li>
                    <a
                      href="/contacto"
                      className="text-sm text-neutral-500 hover:text-neutral-950 dark:hover:text-neutral-100 transition-colors"
                    >
                      Contacta con nosotros
                    </a>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-4">
                  Recursos
                </h4>
                <ul className="flex flex-col gap-3">
                  <li>
                    <a
                      href="/recursos"
                      className="text-sm text-neutral-500 hover:text-neutral-950 dark:hover:text-neutral-100 transition-colors"
                    >
                      Preguntas frecuentes
                    </a>
                  </li>
                  <li>
                    <a
                      href="/blog"
                      className="text-sm text-neutral-500 hover:text-neutral-950 dark:hover:text-neutral-100 transition-colors"
                    >
                      Blog y novedades
                    </a>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-4">
                  Legal
                </h4>
                <ul className="flex flex-col gap-3">
                  <li>
                    <a
                      href="/privacidad"
                      className="text-sm text-neutral-500 hover:text-neutral-950 dark:hover:text-neutral-100 transition-colors"
                    >
                      Política de privacidad
                    </a>
                  </li>
                  <li>
                    <a
                      href="/legal#terminos"
                      className="text-sm text-neutral-500 hover:text-neutral-950 dark:hover:text-neutral-100 transition-colors"
                    >
                      Términos y condiciones
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        <div className="border-t border-neutral-200 dark:border-neutral-800 py-5 px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-center gap-4">
          <p className="text-xs text-neutral-400">
            &copy; {new Date().getFullYear()} Revly. Todos los derechos
            reservados.
          </p>
          <span className="hidden sm:block text-neutral-300 dark:text-neutral-700">
            ·
          </span>
          <div
            className="flex items-center gap-2.5"
            aria-label="Métodos de pago"
          >
            <svg viewBox="0 0 468 222.5" className="h-7 w-auto">
              <path
                fill="#635BFF"
                d="M414,113.4c0-25.6-12.4-45.8-36.1-45.8c-23.8,0-38.2,20.2-38.2,45.6c0,30.1,17,45.3,41.4,45.3 c11.9,0,20.9-2.7,27.7-6.5v-20c-6.8,3.4-14.6,5.5-24.5,5.5c-9.7,0-18.3-3.4-19.4-15.2h48.9C413.8,121,414,115.8,414,113.4z M364.6,103.9c0-11.3,6.9-16,13.2-16c6.1,0,12.6,4.7,12.6,16H364.6z"
              />
              <path
                fill="#635BFF"
                d="M301.1,67.6c-9.8,0-16.1,4.6-19.6,7.8l-1.3-6.2h-22v116.6l25-5.3l0.1-28.3c3.6,2.6,8.9,6.3,17.7,6.3 c17.9,0,34.2-14.4,34.2-46.1C335.1,83.4,318.6,67.6,301.1,67.6z M295.1,136.5c-5.9,0-9.4-2.1-11.8-4.7l-0.1-37.1 c2.6-2.9,6.2-4.9,11.9-4.9c9.1,0,15.4,10.2,15.4,23.3C310.5,126.5,304.3,136.5,295.1,136.5z"
              />
              <polygon
                fill="#635BFF"
                points="223.8,61.7 248.9,56.3 248.9,36 223.8,41.3"
              />
              <rect
                x="223.8"
                y="69.3"
                fill="#635BFF"
                width="25.1"
                height="87.5"
              />
              <path
                fill="#635BFF"
                d="M196.9,76.7l-1.6-7.4h-21.6v87.5h25V97.5c5.9-7.7,15.9-6.3,19-5.2v-23C214.5,68.1,202.8,65.9,196.9,76.7z"
              />
              <path
                fill="#635BFF"
                d="M146.9,47.6l-24.4,5.2l-0.1,80.1c0,14.8,11.1,25.7,25.9,25.7c8.2,0,14.2-1.5,17.5-3.3V135 c-3.2,1.3-19,5.9-19-8.9V90.6h19V69.3h-19L146.9,47.6z"
              />
              <path
                fill="#635BFF"
                d="M79.3,94.7c0-3.9,3.2-5.4,8.5-5.4c7.6,0,17.2,2.3,24.8,6.4V72.2c-8.3-3.3-16.5-4.6-24.8-4.6 C67.5,67.6,54,78.2,54,95.9c0,27.6,38,23.2,38,35.1c0,4.6-4,6.1-9.6,6.1c-8.3,0-18.9-3.4-27.3-8v23.8c9.3,4,18.7,5.7,27.3,5.7 c20.8,0,35.1-10.3,35.1-28.2C117.4,100.6,79.3,105.9,79.3,94.7z"
              />
            </svg>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
