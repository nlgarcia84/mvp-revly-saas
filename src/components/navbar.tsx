'use client';

import { useEffect, useState } from 'react';
import { signOut } from '@/actions/auth';
import DarkToggle from '@/components/ui/dark-toggle';

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
    <header className="relative z-30 flex h-14 shrink-0 items-center border-b border-neutral-200/80 bg-white px-3 transition-colors dark:border-white/10 dark:bg-[#080808] sm:px-5 lg:px-6">
      {/* Botón hamburguesa — solo visible en mobile (lg:hidden) */}
      <button
        onClick={onMenuToggle}
        className="mr-2 flex min-h-10 min-w-10 items-center justify-center rounded-md text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 dark:text-neutral-400 dark:hover:bg-white/[0.06] lg:hidden"
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
      <span className="text-lg font-semibold tracking-[-0.04em] text-neutral-950 sm:text-xl dark:text-white">Revly</span>

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
        {/* Toggle de modo oscuro */}
        <DarkToggle />

        {/* Formulario de cierre de sesión usando Server Action de Next.js */}
        <form action={signOut}>
          <button
            type="submit"
            className="min-h-9 cursor-pointer whitespace-nowrap rounded-md border border-neutral-200 bg-white px-2.5 text-xs text-neutral-500 transition-all hover:border-neutral-950 hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-white/30 dark:hover:text-neutral-100 sm:px-3"
          >
            Cerrar sesión
          </button>
        </form>
      </div>
    </header>
  );
};

export default Navbar;
