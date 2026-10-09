'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

// Definición centralizada de los links de navegación.
// Agregar o quitar rutas aquí las actualiza en ambas versiones (móvil y desktop).
const links = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/business', label: 'Negocios' },
  { href: '/pricing', label: 'Planes' },
  { href: '/profile', label: 'Perfil' },
];

// Un link está activo si la ruta actual es exactamente su href o está
// debajo de él. Con igualdad exacta, /business/abc123 nunca marcaba
// "Negocios" como activo.
const isRouteActive = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(`${href}/`);

// ──────────────────────────────────────────────
// Sidebar
// ──────────────────────────────────────────────
// Renderiza dos versiones del menú de navegación:
//   • Móvil (lg:hidden) — overlay semitransparente +
//     panel deslizante desde la izquierda. Se controla
//     con mobileOpen/onClose desde DashboardShell.
//   • Desktop (lg:block) — sidebar fijo de 220px.
//     visible siempre, sin overlay.
// ──────────────────────────────────────────────
const Sidebar = ({
  mobileOpen,
  onClose,
}: {
  mobileOpen: boolean;
  onClose: () => void;
}) => {
  // usePathname devuelve la ruta actual (ej: "/dashboard").
  // Sirve para determinar qué link está activo.
  const pathname = usePathname();

  useEffect(() => {
    if (!mobileOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [mobileOpen, onClose]);

  // Función que genera las clases de Tailwind para cada link.
  // active = true → estilo "seleccionado"
  // active = false → estilo "inactivo" (transparente, texto gris)
  const linkClass = (active: boolean) =>
    `flex items-center rounded-md border px-3 py-2 text-sm transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 ${
      active
      ? 'border-[#202020] bg-white font-medium text-white shadow-[inset_2px_2px_5px_#000,-2px_-2px_5px_#191919]'
      : 'border-transparent bg-transparent text-neutral-500 hover:bg-[#111] hover:text-white'
    }`;

  return (
    <>
      {/* Overlay semitransparente para mobile.
          Solo se renderiza cuando mobileOpen es true.
          Al hacer clic se cierra el sidebar. */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Cerrar menú"
          className="fixed inset-0 z-40 bg-black/40 dark:bg-black/60 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar móvil: panel deslizante desde la izquierda.
          lg:hidden → no visible en desktop.
          translate-x-0 → visible. -translate-x-full → oculto.
          Los links tienen onClick={onClose} para cerrar al navegar. */}
      <aside
        id="dashboard-mobile-navigation"
        aria-label="Navegación principal"
        aria-modal={mobileOpen || undefined}
        role={mobileOpen ? 'dialog' : undefined}
        className={`fixed bottom-0 left-0 top-14 z-50 flex h-[calc(100dvh-3.5rem)] w-[min(85vw,280px)] flex-col overflow-hidden border-r border-[#171717] bg-[#0A0A0A] pb-[env(safe-area-inset-bottom)] pl-3 pr-4 pt-4 shadow-2xl transition-transform duration-200 motion-reduce:transition-none lg:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
          <div className="flex flex-col gap-1">
          {links.map((link) => {
            const active = isRouteActive(pathname, link.href);
            return (
              <Link key={link.href} href={link.href} onClick={onClose} className={linkClass(active)}>
                {link.label}
              </Link>
            );
          })}
          </div>
        </nav>
      </aside>

      {/* Sidebar desktop: fijo a la izquierda, siempre visible.
          hidden lg:block → oculto en mobile, visible en desktop.
          No tiene overlay ni animación. */}
      <aside className="hidden h-full w-52 shrink-0 border-r border-[#171717] bg-[#0A0A0A] p-3 pl-3 transition-colors lg:block">
        <nav className="flex flex-col gap-1">
          {links.map((link) => {
            const active = isRouteActive(pathname, link.href);
            return (
              <Link key={link.href} href={link.href} className={linkClass(active)}>
                {link.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
