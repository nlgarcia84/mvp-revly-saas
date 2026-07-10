'use client';

import { useState } from 'react';
import Link from 'next/link';

const links = [
  { label: 'Producto', href: '/producto' },
  { label: 'Quienes somos', href: '/quienes-somos' },
  { label: 'Pricing', href: '/pricing' },
];

const MobileMenu = () => {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    window.location.href = `/sign-up?email=${encodeURIComponent(email)}`;
  };

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="sm:hidden p-1.5 rounded-md text-white hover:bg-white/10 transition-colors"
        aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
      >
        <div className="relative w-5 h-4">
          <span
            className={`absolute left-0 block w-5 h-0.5 bg-current rounded-full transition-all duration-300 origin-center ${
              open ? 'top-[7px] rotate-45' : 'top-0'
            }`}
          />
          <span
            className={`absolute left-0 block w-5 h-0.5 bg-current rounded-full transition-all duration-300 origin-center ${
              open ? 'top-[7px] -rotate-45' : 'top-[10px]'
            }`}
          />
        </div>
      </button>

      <div
        className={`fixed left-0 right-0 z-50 flex flex-col bg-white dark:bg-neutral-950 transition-all duration-300 ease-out ${
          open
            ? 'visible opacity-100 bottom-0 top-[68px]'
            : 'invisible opacity-0 bottom-0 top-[68px]'
        }`}
      >
        <nav className="flex-1 overflow-y-auto px-6 pt-8">
          <ul className="flex flex-col gap-1">
            {links.map((link, i) => (
              <li
                key={link.href}
                className={`transition-all duration-300 ease-out ${
                  open
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 translate-y-3'
                }`}
                style={{ transitionDelay: open ? `${i * 70}ms` : '0ms' }}
              >
                <Link
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="block py-3 text-xl font-medium text-neutral-900 dark:text-neutral-100 hover:text-neutral-400 dark:hover:text-neutral-500 transition-colors"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          <hr
            className={`my-6 border-neutral-100 dark:border-neutral-800 transition-all duration-300 ${
              open ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ transitionDelay: open ? `${links.length * 70}ms` : '0ms' }}
          />

          <div
            className={`flex flex-col gap-4 transition-all duration-300 ease-out ${
              open
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-3'
            }`}
            style={{ transitionDelay: open ? `${(links.length + 1) * 70}ms` : '0ms' }}
          >
            <Link
              href="/sign-in"
              onClick={() => setOpen(false)}
              className="text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-neutral-100 transition-colors"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/sign-up"
              onClick={() => setOpen(false)}
              className="text-sm font-medium text-neutral-950 dark:text-neutral-100 hover:text-neutral-400 dark:hover:text-neutral-500 transition-colors"
            >
              Empieza prueba gratuita
            </Link>
          </div>
        </nav>

        <div
          className={`border-t border-neutral-100 dark:border-neutral-800 px-6 py-5 transition-all duration-300 ease-out ${
            open
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-3'
          }`}
          style={{ transitionDelay: open ? `${(links.length + 2) * 70}ms` : '0ms' }}
        >
          <p className="text-xs text-neutral-400 mb-2.5">
            Empieza tu prueba gratuita
          </p>
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              required
              className="flex-1 min-w-0 px-3.5 py-2.5 border border-neutral-200 dark:border-neutral-700 rounded-md text-sm bg-transparent text-neutral-950 dark:text-neutral-100 outline-none focus:border-neutral-950 dark:focus:border-neutral-400 placeholder:text-neutral-400"
            />
            <button
              type="submit"
              className="shrink-0 px-4 py-2.5 rounded-md text-sm font-medium bg-neutral-950 dark:bg-neutral-100 text-white dark:text-neutral-950 hover:bg-neutral-800 dark:hover:bg-neutral-300 transition-colors"
            >
              Empieza prueba gratuita
            </button>
          </form>
        </div>
      </div>
    </>
  );
};

export default MobileMenu;
