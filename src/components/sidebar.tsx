'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Definición centralizada de los links de navegación.
// Agregar o quitar rutas aquí las actualiza en ambas versiones (móvil y desktop).
const links = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/business', label: 'Negocios' },
  { href: '/pricing', label: 'Planes' },
  { href: '/profile', label: 'Perfil' },
];

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

  // Función que genera las clases de Tailwind para cada link.
  // active = true → estilo "seleccionado" (fondo blanco, borde, texto oscuro)
  // active = false → estilo "inactivo" (transparente, texto gris)
  const linkClass = (active: boolean) =>
    `px-3 py-2 rounded-md text-sm transition-all duration-150 ${
      active
        ? 'font-medium bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-950 dark:text-neutral-100'
        : 'bg-transparent border border-transparent text-neutral-500 dark:text-neutral-400'
    }`;

  return (
    <>
      {/* Overlay semitransparente para mobile.
          Solo se renderiza cuando mobileOpen es true.
          Al hacer clic se cierra el sidebar. */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 dark:bg-black/60 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar móvil: panel deslizante desde la izquierda.
          lg:hidden → no visible en desktop.
          translate-x-0 → visible. -translate-x-full → oculto.
          Los links tienen onClick={onClose} para cerrar al navegar. */}
      <aside
        className={`fixed top-14 left-0 bottom-0 w-[250px] z-50 bg-neutral-100 dark:bg-neutral-950 p-4 pl-3 border-r border-neutral-200 dark:border-neutral-800 transition-transform duration-200 lg:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <nav className="flex flex-col gap-1">
          {links.map((link) => {
            const active = pathname === link.href;
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
      <aside className="hidden lg:block w-[220px] border-r border-neutral-200 dark:border-neutral-800 h-full p-4 pl-3 bg-neutral-100 dark:bg-neutral-950 shrink-0 transition-colors">
        <nav className="flex flex-col gap-1">
          {links.map((link) => {
            const active = pathname === link.href;
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
