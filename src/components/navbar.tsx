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
    const update = () => {
      const now = new Date();
      const date = now.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
      const hour = now.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
      });
      setTime(`${date} · ${hour}`);
    };
    update();
    const id = setInterval(update, 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="h-14 border-b border-neutral-200 dark:border-neutral-800 flex items-center px-4 sm:px-6 bg-white dark:bg-neutral-950 shrink-0 transition-colors">
      <button
        onClick={onMenuToggle}
        className="lg:hidden mr-3 p-1.5 rounded-md text-neutral-500 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        aria-label="Abrir menú"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <span className="font-semibold text-base">Revly</span>

      <div className="ml-auto flex items-center gap-3">
        <span className="text-xs text-neutral-400 dark:text-neutral-500" style={{ fontFamily: "'Share Tech Mono', monospace" }}>{time}</span>
        <DarkToggle />

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
