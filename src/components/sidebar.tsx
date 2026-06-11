'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/profile', label: 'Perfil Personal' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/business', label: 'Negocios' },
];

const Sidebar = ({
  mobileOpen,
  onClose,
}: {
  mobileOpen: boolean;
  onClose: () => void;
}) => {
  const pathname = usePathname();

  const linkClass = (active: boolean) =>
    `px-3 py-2 rounded-md text-sm transition-all duration-150 ${
      active
        ? 'font-medium bg-white border border-neutral-200 text-neutral-950'
        : 'bg-transparent border border-transparent text-neutral-500'
    }`;

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`fixed top-14 left-0 bottom-0 w-[250px] z-50 bg-neutral-100 p-4 pl-3 border-r border-neutral-200 transition-transform duration-200 lg:hidden ${
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

      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-[220px] border-r border-neutral-200 h-full p-4 pl-3 bg-neutral-100 shrink-0">
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
