'use client';

import { useEffect, useState } from 'react';
import { signOut } from '@/actions/auth';

// ──────────────────────────────────────────────
// Navbar
// ──────────────────────────────────────────────
// Barra superior del dashboard con:
//   - Hamburguesa para abrir/cerrar sidebar en mobile
//   - Logo "Revly"
//   - Reloj digital en vivo (Share Tech Mono)
//   - Toggle de modo oscuro (DarkToggle)
//   - Botón de cerrar sesión
// ──────────────────────────────────────────────

const Navbar = ({
  mobileOpen,
  onMenuToggle,
}: {
  mobileOpen?: boolean;
  onMenuToggle: () => void;
}) => {
  const [time, setTime] = useState('');

  // Reloj que se actualiza cada 30 segundos
  useEffect(() => {
    // Función que obtiene la fecha/hora actual en formato local
    const update = () => {
      const now = new Date();
      // Fecha: "14 ene 2025"
      const date = now.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
      // Hora: "14:30"
      const hour = now.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
      });
      setTime(`${date} · ${hour}`);
    };
    // Ejecuta inmediatamente al montar
    update();
    // Actualiza cada 30 segundos
    const id = setInterval(update, 30_000);
    // Limpia el intervalo al desmontar para evitar memory leaks
    return () => clearInterval(id);
  }, []);

  return (
    <header className="relative z-[60] flex h-14 shrink-0 items-center border-b border-white/10 bg-[#0b0b0f]/95 px-3 shadow-[0_4px_20px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:px-5 lg:px-6">
      {/* Botón hamburguesa — solo visible en mobile (lg:hidden) */}
      <button
        onClick={onMenuToggle}
        className="relative z-[70] mr-2 flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-white/10 bg-[#17171d] text-white shadow-[0_4px_16px_rgba(0,0,0,0.35)] transition-colors hover:bg-violet-500/10 hover:text-violet-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 lg:hidden"
        aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
        aria-expanded={mobileOpen}
        aria-controls="dashboard-mobile-navigation"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      {/* Logo de la aplicación */}
      <span className="text-lg font-semibold tracking-[-0.04em] text-white sm:text-xl">Revly</span>

      {/* Elementos alineados a la derecha */}
      <div className="ml-auto flex items-center gap-1.5 sm:gap-3">
        {/* LED verde de sesión activa → oculto texto en mobile */}
        <span className="flex items-center gap-1.5 text-[11px] text-neutral-400">
          <span className="relative flex w-2 h-2">
            <span className="absolute inline-flex w-full h-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
            <span className="relative inline-flex w-2 h-2 rounded-full bg-emerald-500" />
          </span>
          <span className="hidden sm:inline">Conectado</span>
        </span>
        {/* Reloj digital con tipografía monoespaciada — oculto en mobile */}
        <span
          className="hidden sm:inline text-xs text-neutral-400 dark:text-neutral-500"
          style={{ fontFamily: "'Share Tech Mono', monospace" }}
        >
          {time}
        </span>
        {/* Formulario de cierre de sesión usando Server Action de Next.js */}
        <form action={signOut}>
          <button
            type="submit"
            className="min-h-10 cursor-pointer whitespace-nowrap rounded-lg border border-white/10 bg-white/[0.04] px-3 text-xs text-neutral-300 shadow-none transition-all hover:border-violet-400/30 hover:bg-violet-500/10 hover:text-white active:shadow-[inset_2px_2px_5px_#000] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
          >
            Cerrar sesión
          </button>
        </form>
      </div>
    </header>
  );
};

export default Navbar;
