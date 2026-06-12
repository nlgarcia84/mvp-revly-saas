'use client';

import { signOut } from '@/actions/auth';

const Navbar = ({ onMenuToggle }: { onMenuToggle: () => void }) => {
  // ── Botón hamburguesa (solo visible en móvil, lg:hidden) ──
  // Al hacer clic, llama a onMenuToggle del DashboardShell
  // para abrir/cerrar el sidebar en pantallas pequeñas.
  return (
    <header className="h-14 border-b border-neutral-200 flex items-center px-4 sm:px-6 bg-white shrink-0">
      <button
        onClick={onMenuToggle}
        className="lg:hidden mr-3 p-1.5 rounded-md text-neutral-500 hover:text-neutral-950 hover:bg-neutral-100 transition-colors"
        aria-label="Abrir menú"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <span className="font-semibold text-base">Revly</span>
      <div className="ml-auto">
        <form action={signOut}>
          <button
            type="submit"
            className="text-sm text-neutral-500 hover:text-neutral-950 transition-colors"
          >
            Cerrar sesión
          </button>
        </form>
      </div>
    </header>
  );
};

export default Navbar;
