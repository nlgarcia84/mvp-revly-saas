import MobileMenu from "@/components/mobile-menu";
import Button from "@/components/ui/button";
import {
  ArrowRight,
  BarChart3,
  Check,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
  Zap,
} from "lucide-react";
import dynamic from "next/dynamic";

// El asistente de ayuda se carga de forma lazy (chunk separado) para no
// penalizar el render inicial de la landing. El panel solo se monta al pulsar
// el botón flotante y los vídeos solo cuando el usuario los solicita.
const LandingChat = dynamic(
  () => import("@/components/landing-chat/LandingChat"),
);

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
      <header className="fixed left-0 right-0 top-0 z-[60] border-b border-white/10 bg-[#08080a]/95 px-5 py-4 backdrop-blur-xl sm:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <a href="/" className="flex items-center gap-2.5 text-white">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-sm font-bold text-black">R</span>
            <span className="text-lg font-semibold tracking-tight">Revly</span>
          </a>
          <nav className="hidden items-center gap-7 text-sm text-neutral-400 lg:flex">
            <a href="#producto" className="transition-colors hover:text-white">Producto</a>
            <a href="#como-funciona" className="transition-colors hover:text-white">Cómo funciona</a>
            <a href="/pricing" className="transition-colors hover:text-white">Precios</a>
            <a href="/recursos" className="transition-colors hover:text-white">Recursos</a>
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
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
        </div>
      </header>

      <main className="overflow-hidden bg-[#08080a] text-white">
        <section className="relative px-5 pb-20 pt-32 sm:px-8 sm:pb-28 sm:pt-40">
          <div className="pointer-events-none absolute left-1/2 top-0 h-[620px] w-[900px] -translate-x-1/2 rounded-full bg-violet-600/15 blur-[130px]" />
          <div className="pointer-events-none absolute right-[-180px] top-40 h-96 w-96 rounded-full bg-cyan-500/10 blur-[110px]" />
          <div className="relative mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1fr_0.9fr] lg:gap-20">
            <div className="max-w-3xl">
              <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-violet-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_12px_#34d399]" />
                La plataforma de crecimiento para negocios locales
              </div>
              <h1 className="max-w-3xl text-5xl font-semibold leading-[0.98] tracking-[-0.055em] sm:text-6xl lg:text-8xl">
                Convierte cada cliente en una historia que contar.
              </h1>
              <p className="mt-7 max-w-xl text-base leading-7 text-neutral-400 sm:text-lg">
                Revly reúne reseñas, fidelización y respuestas con IA en un solo lugar para que tu negocio crezca con la confianza de tus clientes.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Button as="link" variant="secondary" href="/sign-up" className="border-white bg-white px-6 py-3 !text-black shadow-none hover:bg-violet-100">
                  Empieza gratis <ArrowRight className="h-4 w-4" />
                </Button>
                <a href="#como-funciona" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/15 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-white/10">
                  Descubre cómo funciona
                </a>
              </div>
              <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-neutral-500">
                <span className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400" />Sin tarjeta de crédito</span>
                <span className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400" />Configuración en 5 minutos</span>
              </div>
            </div>
            <div className="relative mx-auto w-full max-w-md">
              <div className="absolute -inset-5 rounded-[2rem] bg-gradient-to-br from-violet-500/20 to-cyan-400/10 blur-2xl" />
              <div className="relative rounded-[1.5rem] border border-white/10 bg-[#111116] p-3 shadow-2xl shadow-black/50">
                <div className="rounded-[1.1rem] border border-white/10 bg-[#0b0b0f] p-5">
                  <div className="mb-8 flex items-center justify-between">
                    <div><p className="text-xs text-neutral-500">Resumen de reputación</p><p className="mt-1 text-lg font-semibold">Tu negocio esta creciendo</p></div>
                    <div className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-xs text-emerald-300">+24,8%</div>
                  </div>
                  <div className="flex items-end gap-2">
                    <span className="text-6xl font-semibold tracking-tight">4.8</span><span className="mb-2 text-amber-300">★★★★★</span>
                  </div>
                  <p className="mt-2 text-xs text-neutral-500">Valoración media · últimos 30 días</p>
                  <div className="mt-8 flex h-28 items-end gap-2">
                    {[38, 52, 46, 68, 60, 79, 92, 84, 100].map((height, index) => (
                      <div key={index} className="flex-1 rounded-t-md bg-gradient-to-t from-violet-600 to-cyan-300 opacity-90" style={{ height: `${height}%` }} />
                    ))}
                  </div>
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3"><p className="text-xs text-neutral-500">Nuevas reseñas</p><p className="mt-1 text-xl font-semibold">+128</p></div>
                    <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3"><p className="text-xs text-neutral-500">Respondidas por IA</p><p className="mt-1 text-xl font-semibold">96%</p></div>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-5 -left-6 hidden items-center gap-3 rounded-xl border border-white/10 bg-[#17171d] px-4 py-3 shadow-xl sm:flex">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-400/15 text-emerald-300"><TrendingUp className="h-4 w-4" /></span>
                <span><span className="block text-xs text-neutral-500">Conversión</span><strong className="text-sm">+31% este mes</strong></span>
              </div>
            </div>
          </div>
        </section>

        <div className="border-y border-white/10 bg-white/[0.025] px-5 py-5 sm:px-8">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
            <span className="text-xs uppercase tracking-[0.18em] text-neutral-500">Todo lo que necesitas para crecer con confianza</span>
            <div className="flex items-center gap-5 text-xs text-neutral-400"><span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-violet-300" />Datos seguros</span><span className="flex items-center gap-1.5"><Zap className="h-4 w-4 text-cyan-300" />Resultados accionables</span></div>
          </div>
        </div>

        <section id="producto" className="mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:py-32">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300">Una visión completa</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">Tu reputación, por fin bajo control.</h2>
            <p className="mt-5 text-base leading-7 text-neutral-400">Menos herramientas dispersas. Más claridad para saber qué está funcionando y qué puedes mejorar hoy.</p>
          </div>
          <div className="mt-12 grid gap-4 lg:grid-cols-12">
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-violet-500/15 to-white/[0.03] p-6 lg:col-span-7 lg:p-8">
              <Sparkles className="h-6 w-6 text-violet-300" /><h3 className="mt-12 text-2xl font-semibold">Respuestas que suenan a ti</h3><p className="mt-3 max-w-md text-sm leading-6 text-neutral-400">La IA entiende cada reseña, detecta el contexto y prepara una respuesta humana, cercana y lista para publicar.</p>
              <div className="mt-8 rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-neutral-300">“Gracias por compartir tu experiencia. Hemos revisado lo ocurrido con el equipo y ya estamos trabajando para mejorar...”</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 lg:col-span-5 lg:p-8">
              <MessageCircle className="h-6 w-6 text-cyan-300" /><h3 className="mt-12 text-2xl font-semibold">Más conversaciones, menos trabajo</h3><p className="mt-3 text-sm leading-6 text-neutral-400">Automatiza solicitudes por QR y email en el momento de mayor satisfacción.</p>
              <div className="mt-7 flex items-center gap-2 text-xs text-neutral-400"><span className="h-2 w-2 rounded-full bg-emerald-400" />Flujos activos 24/7</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 lg:col-span-5 lg:p-8">
              <BarChart3 className="h-6 w-6 text-amber-300" /><h3 className="mt-12 text-2xl font-semibold">Decisiones con datos</h3><p className="mt-3 text-sm leading-6 text-neutral-400">Identifica patrones, problemas recurrentes y oportunidades antes que tu competencia.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-cyan-500/10 to-white/[0.03] p-6 lg:col-span-7 lg:p-8">
              <TrendingUp className="h-6 w-6 text-emerald-300" /><h3 className="mt-12 text-2xl font-semibold">Una relación que crece</h3><p className="mt-3 max-w-md text-sm leading-6 text-neutral-400">Conecta reseñas, clientes y fidelización para que cada visita abra la puerta a la siguiente.</p>
              <div className="mt-8 flex flex-wrap gap-2 text-xs text-neutral-400"><span className="rounded-full border border-white/10 px-3 py-1.5">Reseñas</span><span className="rounded-full border border-white/10 px-3 py-1.5">Puntos</span><span className="rounded-full border border-white/10 px-3 py-1.5">Clientes</span><span className="rounded-full border border-white/10 px-3 py-1.5">Analítica</span></div>
            </div>
          </div>
        </section>

        <section id="como-funciona" className="border-y border-white/10 bg-[#0d0d12] px-5 py-24 sm:px-8 lg:py-32">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
              <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Empieza hoy</p><h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">Simple para ti.<br />Notable para tus clientes.</h2></div>
              <p className="max-w-sm text-sm leading-6 text-neutral-400">Una puesta en marcha sencilla para que puedas dedicar tu tiempo a tu negocio, no a perseguir herramientas.</p>
            </div>
            <div className="mt-14 grid gap-8 md:grid-cols-3">
              {[["01", "Conecta tu negocio", "Importa tu ficha y reúne tus canales en un solo panel."], ["02", "Activa tus solicitudes", "Comparte tu QR o automatiza invitaciones por email."], ["03", "Mejora cada semana", "Lee los patrones, responde mejor y convierte más visitas."]].map(([number, title, description]) => (
                <div key={number} className="border-t border-white/15 pt-5"><span className="text-sm text-violet-300">{number}</span><h3 className="mt-10 text-xl font-semibold">{title}</h3><p className="mt-3 text-sm leading-6 text-neutral-400">{description}</p></div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:py-32">
          <div className="relative overflow-hidden rounded-3xl border border-violet-400/20 bg-gradient-to-br from-violet-600/25 via-[#16131f] to-cyan-500/10 px-6 py-14 text-center sm:px-12">
            <div className="pointer-events-none absolute left-1/2 top-0 h-48 w-96 -translate-x-1/2 rounded-full bg-violet-400/20 blur-3xl" />
            <div className="relative"><Star className="mx-auto h-6 w-6 fill-amber-300 text-amber-300" /><h2 className="mx-auto mt-5 max-w-2xl text-3xl font-semibold tracking-tight sm:text-5xl">Tu próxima gran reseña empieza hoy.</h2><p className="mx-auto mt-5 max-w-xl text-sm leading-6 text-violet-100/70 sm:text-base">Únete a los negocios que convierten la confianza en crecimiento sostenible.</p><Button as="link" variant="secondary" href="/sign-up" className="relative mt-8 border-white bg-white px-7 !text-black shadow-none hover:bg-violet-100">Comenzar gratis <ArrowRight className="h-4 w-4" /></Button></div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-[#08080a] text-white transition-colors">
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
        <div className="border-t border-white/10 py-5 px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-center gap-4">
          <p className="text-xs text-neutral-400">
            &copy; {new Date().getFullYear()} Revly.
          </p>
          <p className="text-xs text-neutral-400">
            Sitio web desarrollado por{" "}
          </p>
          <a
            href="https://ndsoftlabs.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-neutral-500 hover:text-neutral-950 dark:hover:text-neutral-100 transition-colors"
          >
            ND Soft Labs
          </a>
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

      <LandingChat />
    </div>
  );
};

export default HomePage;
