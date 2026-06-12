'use client';

import { useEffect, useState } from 'react';

// ──────────────────────────────────────────────
// DarkToggle
// ──────────────────────────────────────────────
// Botón de cambio de modo oscuro/claro que se
// sincroniza con localStorage y la clase .dark
// en <html>. No usa preferencia del sistema: por
// defecto siempre light a menos que el usuario
// haya elegido explícitamente dark antes.
// ──────────────────────────────────────────────

const DarkToggle = () => {
  const [dark, setDark] = useState(false);

  // Al montar, lee el tema guardado y lo aplica
  useEffect(() => {
    const stored = localStorage.getItem('theme');
    const isDark = stored === 'dark';
    setDark(isDark);
    document.documentElement.classList.toggle('dark', isDark);
  }, []);

  // Cambia entre dark/light y persiste en localStorage
  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

  return (
    <button
      onClick={toggle}
      className="p-1.5 rounded-md text-neutral-500 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
      aria-label="Cambiar modo"
    >
      {dark ? (
        // Icono de sol → modo claro
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ) : (
        // Icono de luna → modo oscuro
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )}
    </button>
  );
};

export default DarkToggle;
