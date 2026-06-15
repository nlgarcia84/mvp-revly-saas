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

const Navbar = ({ onMenuToggle }: { onMenuToggle: () => void }) => {
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
    <header className="h-[72px] border-b border-neutral-200 dark:border-neutral-800 flex items-center px-6 sm:px-8 bg-white dark:bg-neutral-950 shrink-0 transition-colors">
      {/* Botón hamburguesa — solo visible en mobile (lg:hidden) */}
      <button
        onClick={onMenuToggle}
        className="lg:hidden mr-3 p-1.5 rounded-md text-neutral-500 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        aria-label="Abrir menú"
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
      <span className="font-semibold text-base">Revly</span>

      {/* Elementos alineados a la derecha */}
      <div className="ml-auto flex items-center gap-3">
        {/* LED verde de sesión activa */}
        <span className="flex items-center gap-1.5 text-[11px] text-neutral-400">
          <span className="relative flex w-2 h-2">
            <span className="absolute inline-flex w-full h-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
            <span className="relative inline-flex w-2 h-2 rounded-full bg-emerald-500" />
          </span>
          Conectado
        </span>
        {/* Reloj digital con tipografía monoespaciada */}
        <span
          className="text-xs text-neutral-400 dark:text-neutral-500"
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
            className="text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-neutral-100 transition-colors"
          >
            Cerrar sesión
          </button>
        </form>
      </div>
    </header>
  );
};

export default Navbar;
