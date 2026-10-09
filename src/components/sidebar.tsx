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
  // active = true → estilo "seleccionado" (fondo blanco, borde, texto oscuro)
  // active = false → estilo "inactivo" (transparente, texto gris)
  const linkClass = (active: boolean) =>
    `flex min-h-11 items-center rounded-lg border px-3 text-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
      active
        ? 'border-neutral-200 bg-white font-medium text-neutral-950 dark:border-[#2A3240] dark:bg-[#1B202B] dark:text-neutral-100'
        : 'border-transparent bg-transparent text-neutral-500 hover:border-neutral-200/70 hover:bg-white/70 hover:text-neutral-950 dark:text-neutral-400 dark:hover:border-[#2A3240] dark:hover:bg-[#151922] dark:hover:text-neutral-100'
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
          className="fixed inset-0 bg-black/40 dark:bg-black/60 z-40 lg:hidden"
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
        className={`fixed bottom-0 left-0 top-16 z-50 w-[min(85vw,280px)] border-r border-neutral-200 bg-[#F5F7FA] p-4 pl-3 transition-transform duration-200 dark:border-[#1B202B] dark:bg-[#10131A] lg:top-[72px] lg:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <nav className="flex flex-col gap-1">
          {links.map((link) => {
            const active = isRouteActive(pathname, link.href);
            return (
              <Link key={link.href} href={link.href} onClick={onClose} className={linkClass(active)}>
                {link.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Sidebar desktop: fijo a la izquierda, siempre visible.
          hidden lg:block → oculto en mobile, visible en desktop.
          No tiene overlay ni animación. */}
      <aside className="hidden h-full w-[232px] shrink-0 border-r border-neutral-200 bg-[#F5F7FA] p-4 pl-3 transition-colors dark:border-[#1B202B] dark:bg-[#10131A] lg:block">
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
