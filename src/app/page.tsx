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
import { ArrowUpRight, Sparkles, Star, TrendingUp } from "lucide-react";
import dynamic from "next/dynamic";

const LandingChat = dynamic(
  () => import("@/components/landing-chat/LandingChat"),
);

const featureCards = [
  {
    icon: Sparkles,
    title: "Solicitudes automatizadas",
    description: "QR y email. Solicita reseñas en el momento justo sin esfuerzo manual.",
    body: "Cada interacción con tu cliente es una oportunidad para conseguir una nueva reseña en Google. Automatiza el proceso y multiplica tus valoraciones sin apenas esfuerzo.",
  },
  {
    icon: Star,
    title: "Respuestas con IA",
    description: "Responde a cada reseña con contexto generado por inteligencia artificial en segundos.",
    body: "Mantén una comunicación activa con todos tus clientes sin invertir horas. La IA redacta respuestas coherentes, profesionales y personalizadas para cada reseña.",
  },
  {
    icon: TrendingUp,
    title: "Analítica y crecimiento",
    description: "Mide, aprende y mejora tu reputación digital con datos claros y accionables.",
    body: "Seguimiento de reseñas, tendencias de puntuación y alertas inteligentes para actuar antes de que un problema escale. Convierte la reputación en tu mejor canal de adquisición.",
  },
];

const footerGroups = [
  {
    title: "Producto",
    links: [
      ["/producto", "Conoce Revly"],
      ["/sign-up", "Comenzar gratis"],
    ],
  },
  { title: "Soporte", links: [["/contacto", "Contacta con nosotros"]] },
  {
    title: "Recursos",
    links: [
      ["/recursos", "Preguntas frecuentes"],
      ["/blog", "Blog y novedades"],
    ],
  },
  {
    title: "Legal",
    links: [
      ["/privacidad", "Política de privacidad"],
      ["/legal#terminos", "Términos y condiciones"],
    ],
  },
];

const HomePage = () => (
  <div className="min-h-screen overflow-x-hidden bg-[#0B0D12] text-[#F5F7FA]">
    <header className="fixed inset-x-0 top-0 z-40 border-b border-white/[0.08] bg-[#0B0D12]/85 px-4 backdrop-blur-xl sm:px-6">
      <div className="mx-auto flex h-[72px] w-full max-w-7xl items-center justify-between">
        <a href="/" className="text-xl font-semibold tracking-[-0.04em] text-white sm:text-2xl" aria-label="Revly, inicio">
          Revly<span className="text-sky-400">.</span>
        </a>
        <div className="flex items-center gap-1 sm:gap-3">
          <DarkToggle />
          <MobileMenu />
          <div className="hidden items-center gap-2 sm:flex">
            <Button as="link" variant="secondary" href="/sign-in" className="border-white/10 bg-transparent px-4 py-2 text-sm text-slate-300 hover:border-white/20 hover:bg-white/[0.06] hover:text-white">
              Iniciar sesión
            </Button>
            <Button as="link" variant="primary" href="/sign-up" className="border-sky-400 bg-sky-400 px-4 py-2 text-sm text-slate-950 hover:border-sky-300 hover:bg-sky-300">
              Registrarse
            </Button>
          </div>
        </div>
      </div>
    </header>

    <main>
      <section className="relative isolate overflow-hidden border-b border-white/[0.08] px-4 pb-20 pt-36 sm:px-6 sm:pb-28 sm:pt-44 lg:px-8">
        <div className="absolute inset-0 -z-10">
          <video autoPlay muted loop playsInline className="h-full w-full object-cover opacity-[0.16]" aria-hidden="true">
            <source src="/videos/mobilevideo.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-[linear-gradient(110deg,#0B0D12_10%,rgba(11,13,18,.86)_52%,#0B0D12_100%)]" />
          <div className="absolute -left-48 top-20 h-[28rem] w-[28rem] rounded-full bg-sky-500/[0.08] blur-3xl" />
          <div className="absolute -right-48 bottom-0 h-[24rem] w-[24rem] rounded-full bg-violet-500/[0.07] blur-3xl" />
        </div>
        <div className="relative mx-auto grid w-full max-w-7xl items-center gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(360px,500px)] lg:gap-20">
          <div className="max-w-2xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-400/[0.08] px-3 py-1.5 text-xs font-medium text-sky-300">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
              Reputación que trabaja por ti
            </div>
            <h1 className="max-w-3xl text-4xl font-semibold leading-[1.04] tracking-[-0.055em] text-white sm:text-6xl lg:text-[4.75rem]">
              Convierte cada reseña en una oportunidad de crecimiento.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
              Automatiza solicitudes de reseña por QR y email. Responde con inteligencia artificial y construye una reputación online imparable.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button as="link" variant="primary" href="/sign-up" className="w-full border-sky-400 bg-sky-400 py-3.5 text-slate-950 hover:border-sky-300 hover:bg-sky-300 sm:w-auto sm:px-7">
                Comenzar gratis <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button as="link" variant="secondary" href="/sign-in" className="w-full border-white/15 bg-white/[0.04] py-3.5 text-slate-200 hover:border-white/25 hover:bg-white/[0.08] hover:text-white sm:w-auto sm:px-7">
                Iniciar sesión
              </Button>
            </div>
            <p className="mt-5 text-xs text-slate-500">Empieza sin compromiso. Diseñado para negocios que quieren avanzar.</p>
          </div>
          <div className="mx-auto w-full max-w-lg lg:mx-0 lg:justify-self-end">
            <AiWritingReview />
          </div>
        </div>
      </section>

      <section className="bg-[#10131A] px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 max-w-2xl sm:mb-14">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-sky-400">Todo en un mismo lugar</p>
            <h2 className="text-3xl font-semibold leading-tight tracking-[-0.04em] text-white sm:text-5xl">La reputación de tu negocio, bajo control.</h2>
            <p className="mt-5 text-base leading-7 text-slate-400">Desde el primer código QR hasta el análisis de reseñas con IA. Una plataforma que convierte clientes satisfechos en reseñas de 5 estrellas.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {featureCards.map(({ icon: Icon, title, description, body }) => (
              <LandingCard key={title}>
                <LandingCardHeader>
                  <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-xl border border-sky-400/20 bg-sky-400/[0.08]">
                    <Icon className="h-5 w-5 text-sky-300" aria-hidden="true" />
                  </div>
                  <LandingCardTitle>{title}</LandingCardTitle>
                  <LandingCardDescription>{description}</LandingCardDescription>
                </LandingCardHeader>
                <LandingCardContent><p className="text-sm leading-7 text-slate-400">{body}</p></LandingCardContent>
              </LandingCard>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-white/[0.08] bg-[#0B0D12]">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <div className="grid gap-12 lg:grid-cols-[1.2fr_2fr]">
            <div>
              <a href="/" className="text-xl font-semibold tracking-[-0.04em] text-white">Revly<span className="text-sky-400">.</span></a>
              <p className="mt-4 max-w-xs text-sm leading-6 text-slate-500">Gestiona tu reputación online con una experiencia más clara y eficiente.</p>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4">
              {footerGroups.map((group) => (
                <div key={group.title}>
                  <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{group.title}</h3>
                  <ul className="space-y-3">
                    {group.links.map(([href, label]) => <li key={href}><a href={href} className="text-sm text-slate-400 transition-colors hover:text-white focus-visible:text-white">{label}</a></li>)}
                  </ul>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-14 flex flex-col gap-3 border-t border-white/[0.08] pt-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <span>&copy; {new Date().getFullYear()} Revly.</span>
            <span>Sitio web desarrollado por <a href="https://ndsoftlabs.com" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white">ND Soft Labs</a></span>
            <div className="flex items-center gap-2.5" aria-label="Métodos de pago">
              <svg viewBox="0 0 468 222.5" className="h-7 w-auto" aria-label="Stripe">
                <path fill="#8B8DF8" d="M414,113.4c0-25.6-12.4-45.8-36.1-45.8c-23.8,0-38.2,20.2-38.2,45.6c0,30.1,17,45.3,41.4,45.3c11.9,0,20.9-2.7,27.7-6.5v-20c-6.8,3.4-14.6,5.5-24.5,5.5c-9.7,0-18.3-3.4-19.4-15.2h48.9C413.8,121,414,115.8,414,113.4z M364.6,103.9c0-11.3,6.9-16,13.2-16c6.1,0,12.6,4.7,12.6,16H364.6z" />
                <path fill="#8B8DF8" d="M301.1,67.6c-9.8,0-16.1,4.6-19.6,7.8l-1.3-6.2h-22v116.6l25-5.3l0.1-28.3c3.6,2.6,8.9,6.3,17.7,6.3c17.9,0,34.2-14.4,34.2-46.1C335.1,83.4,318.6,67.6,301.1,67.6z M295.1,136.5c-5.9,0-9.4-2.1-11.8-4.7l-0.1-37.1c2.6-2.9,6.2-4.9,11.9-4.9c9.1,0,15.4,10.2,15.4,23.3C310.5,126.5,304.3,136.5,295.1,136.5z" />
                <polygon fill="#8B8DF8" points="223.8,61.7 248.9,56.3 248.9,36 223.8,41.3" />
                <rect x="223.8" y="69.3" fill="#8B8DF8" width="25.1" height="87.5" />
                <path fill="#8B8DF8" d="M196.9,76.7l-1.6-7.4h-21.6v87.5h25V97.5c5.9-7.7,15.9-6.3,19-5.2v-23C214.5,68.1,202.8,65.9,196.9,76.7z" />
                <path fill="#8B8DF8" d="M146.9,47.6l-24.4,5.2l-0.1,80.1c0,14.8,11.1,25.7,25.9,25.7c8.2,0,14.2-1.5,17.5-3.3V135c-3.2,1.3-19,5.9-19-8.9V90.6h19V69.3h-19L146.9,47.6z" />
                <path fill="#8B8DF8" d="M79.3,94.7c0-3.9,3.2-5.4,8.5-5.4c7.6,0,17.2,2.3,24.8,6.4V72.2c-8.3-3.3-16.5-4.6-24.8-4.6C67.5,67.6,54,78.2,54,95.9c0,27.6,38,23.2,38,35.1c0,4.6-4,6.1-9.6,6.1c-8.3,0-18.9-3.4-27.3-8v23.8c9.3,4,18.7,5.7,27.3,5.7c20.8,0,35.1-10.3,35.1-28.2C117.4,100.6,79.3,105.9,79.3,94.7z" />
              </svg>
            </div>
          </div>
        </div>
      </footer>
    </main>
    <LandingChat />
  </div>
);

export default HomePage;
