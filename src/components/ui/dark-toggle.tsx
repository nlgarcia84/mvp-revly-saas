'use client';

import { useEffect, useState } from 'react';

// ──────────────────────────────────────────────
// DarkToggle
// ──────────────────────────────────────────────
// Botón de cambio de modo oscuro/claro que se
// sincroniza con localStorage y la clase .dark
// en <html>. Por defecto oscuro a menos que el
// usuario haya elegido explícitamente light.
// ──────────────────────────────────────────────

const DarkToggle = () => {
  // El script del layout aplica la clase antes de hidratar. Leerla aquí evita
  // que el icono se renderice primero con un tema distinto al visible.
  const [dark, setDark] = useState(() => {
    if (typeof window === 'undefined') return true;
    const stored = window.localStorage.getItem('theme');
    return stored === 'light'
      ? false
      : stored === 'dark' || document.documentElement.classList.contains('dark');
  });

  // Al montar, lee el tema guardado en localStorage y lo aplica
  useEffect(() => {
    const stored = localStorage.getItem('theme');
    const isDark = stored !== 'light';
    setDark(isDark);
    // Sincroniza la clase .dark en <html> para que Tailwind la reconozca
    document.documentElement.classList.toggle('dark', isDark);
  }, []);

  // Cambia entre dark/light y persiste en localStorage
  const toggle = () => {
    const next = !dark;
    setDark(next);
    // Aplica/remueve la clase .dark en <html>
    document.documentElement.classList.toggle('dark', next);
    // Guarda la preferencia para la próxima visita
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

  return (
    <button
      onClick={toggle}
      className="min-h-10 min-w-10 rounded-md p-2 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 dark:text-neutral-400 dark:hover:bg-[#151922] dark:hover:text-neutral-100"
      aria-label="Cambiar modo"
    >
      {dark ? (
        // Ícono de sol → modo claro. Se muestra cuando está en dark
        // para indicar que al hacer clic se pasa a light.
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ) : (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )}
    </button>
  );
};

export default DarkToggle;
