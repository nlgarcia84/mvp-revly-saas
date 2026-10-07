'use client';

// ─── Sub-navegación del negocio ──────────────────────
// Pestañas de primer nivel dentro de /business/[id]. Vive en el
// layout, así que permanece fija al hacer scroll y el negocio se
// carga una sola vez aunque cambies de sección.
//
// El estado activo se deriva de la URL (usePathname), no de un
// estado local: cada sección es una ruta real, por lo que se puede
// marcar, compartir y usar el botón atrás del navegador.
// ────────────────────────────────────────────────────

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export const BUSINESS_TABS = [
  { href: '', label: 'Resumen' },
  { href: '/clientes', label: 'Clientes' },
  { href: '/reputacion', label: 'Reputación' },
  { href: '/reservas', label: 'Reservas' },
  { href: '/redes', label: 'Redes sociales' },
  { href: '/local', label: 'Mi local' },
  { href: '/settings', label: 'Ajustes' },
] as const;

const BusinessSubnav = ({ businessId }: { businessId: string }) => {
  const pathname = usePathname();

  const isActive = (suffix: string) => {
    const base = `/business/${businessId}`;
    const target = suffix ? `${base}${suffix}` : base;
    return pathname === target || pathname.startsWith(`${target}/`);
  };

  return (
    <nav
      aria-label="Secciones del negocio"
      className="sticky top-0 z-30 -mx-5 sm:-mx-6 lg:-mx-8 px-5 sm:px-6 lg:px-8 bg-neutral-100/90 dark:bg-neutral-900/90 backdrop-blur border-b border-neutral-200 dark:border-neutral-800"
    >
      <div className="flex gap-1 overflow-x-auto py-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {BUSINESS_TABS.map((tab) => {
          const active = isActive(tab.href);
          return (
            <Link
              key={tab.href}
              href={`/business/${businessId}${tab.href}`}
              aria-current={active ? 'page' : undefined}
              className={`whitespace-nowrap text-xs sm:text-sm px-3 py-2 rounded-md border transition-colors ${
                active
                  ? 'font-medium border-neutral-950 dark:border-neutral-100 bg-neutral-950 dark:bg-neutral-100 text-white dark:text-neutral-950'
                  : 'border-transparent text-neutral-500 dark:text-neutral-400 hover:bg-white/60 dark:hover:bg-neutral-800/60 hover:text-neutral-950 dark:hover:text-neutral-100'
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BusinessSubnav;
