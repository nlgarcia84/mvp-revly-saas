'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/business', label: 'Negocios' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-[220px] border-r border-neutral-200 h-full p-4 pl-3 bg-neutral-100">
      <nav className="flex flex-col gap-1">
        {links.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-2 rounded-md text-sm transition-all duration-150 ${
                active
                  ? 'font-medium bg-white border border-neutral-200 text-neutral-950'
                  : 'bg-transparent border border-transparent text-neutral-500'
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
