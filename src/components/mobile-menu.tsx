'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const links = [
  { label: 'Producto', href: '/producto' },
  { label: 'Quienes somos', href: '/quienes-somos' },
  { label: 'Pricing', href: '/pricing' },
];

const MobileMenu = () => {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    window.location.href = `/sign-up?email=${encodeURIComponent(email)}`;
  };

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls="mobile-navigation"
        className="rounded-lg p-2 text-slate-300 transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 sm:hidden"
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

      {open && (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] sm:hidden"
        />
      )}

      <div
        id="mobile-navigation"
        aria-hidden={!open}
        className={`fixed inset-x-0 bottom-0 top-[72px] z-50 flex max-h-[calc(100dvh-4.5rem)] flex-col border-b border-neutral-200 bg-white pb-[env(safe-area-inset-bottom)] transition-[opacity,visibility] duration-300 ease-out dark:border-neutral-800 dark:bg-neutral-950 sm:hidden ${
          open
            ? 'visible opacity-100'
            : 'invisible opacity-0'
        }`}
      >
        <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-6 pt-8">
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
                  className="block py-3 text-xl font-medium text-neutral-900 transition-colors hover:text-neutral-400 dark:text-neutral-100 dark:hover:text-neutral-500"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          <hr
            className={`my-6 border-neutral-200 transition-all duration-300 dark:border-neutral-800 ${
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
              className="text-sm text-neutral-500 transition-colors hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-neutral-100"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/sign-up"
              onClick={() => setOpen(false)}
              className="text-sm font-medium text-neutral-950 transition-colors hover:text-neutral-400 dark:text-neutral-100 dark:hover:text-neutral-500"
            >
              Empieza prueba gratuita
            </Link>
          </div>
        </nav>

        <div
          className={`border-t border-neutral-200 px-6 py-5 transition-all duration-300 ease-out dark:border-neutral-800 ${
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
              className="min-w-0 flex-1 rounded-md border border-neutral-200 bg-transparent px-3.5 py-2.5 text-sm text-neutral-950 outline-none placeholder:text-neutral-400 focus:border-neutral-950 dark:border-neutral-700 dark:text-neutral-100 dark:placeholder:text-neutral-400 dark:focus:border-neutral-400"
            />
            <button
              type="submit"
              className="shrink-0 rounded-md bg-neutral-950 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:bg-neutral-100 dark:text-neutral-950 dark:hover:bg-neutral-300"
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
