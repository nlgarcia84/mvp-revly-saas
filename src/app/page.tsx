import Link from 'next/link';

const HomePage = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="h-14 border-b border-neutral-200 flex items-center justify-between px-6">
        <span className="font-semibold text-2xl">Revly</span>
        <div className="flex gap-3">
          <Link
            href="/sign-in"
            className="inline-flex items-center justify-center gap-2 px-4.5 py-2 rounded-md text-sm font-medium border border-neutral-200 bg-white text-neutral-950 transition-all duration-150 hover:bg-neutral-100 hover:border-neutral-300"
          >
            Iniciar sesión
          </Link>
          <Link
            href="/sign-up"
            className="inline-flex items-center justify-center gap-2 px-4.5 py-2 rounded-md text-sm font-medium border border-neutral-950 bg-neutral-950 text-white transition-all duration-150 hover:bg-neutral-800 hover:border-neutral-800"
          >
            Registrarse
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-160 text-center">
          <h1 className="text-5xl font-bold tracking-tight leading-[1.1] mb-4">
            Gestiona la voz de tus clientes
          </h1>
          <p className="text-lg text-neutral-500 leading-relaxed mb-8">
            Ayuda a tu negocio a conseguir reseñas en Google de forma
            automática. Solicitudes personalizadas, seguimiento simple y más
            visibilidad online.
          </p>
          <div className="flex gap-3 justify-center">
            <Link
              href="/sign-up"
              className="inline-flex items-center justify-center gap-2 px-7 py-3 rounded-md text-base font-medium border border-neutral-950 bg-neutral-950 text-white transition-all duration-150 hover:bg-neutral-800 hover:border-neutral-800"
            >
              Comenzar gratis
            </Link>
            <Link
              href="/sign-in"
              className="inline-flex items-center justify-center gap-2 px-7 py-3 rounded-md text-base font-medium border border-neutral-200 bg-white text-neutral-950 transition-all duration-150 hover:bg-neutral-100 hover:border-neutral-300"
            >
              Iniciar sesión
            </Link>
          </div>
        </div>
      </main>

      <footer className="border-t border-neutral-200 py-4 px-6 text-center text-[13px] text-neutral-400">
        Reseñas MVP
      </footer>
    </div>
  );
};

export default HomePage;
