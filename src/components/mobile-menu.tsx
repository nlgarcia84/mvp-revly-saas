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
        className={`fixed inset-x-0 bottom-0 top-[72px] z-50 flex max-h-[calc(100dvh-4.5rem)] flex-col border-b border-neutral-200 bg-white pb-[env(safe-area-inset-bottom)] transition-[opacity,visibility] duration-300 ease-out dark:border-white/[0.08] dark:bg-[#0B0D12] sm:hidden ${
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
                  className="block py-3 text-xl font-medium text-neutral-950 transition-colors hover:text-sky-500 dark:text-white dark:hover:text-sky-300"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          <hr
            className={`my-6 border-neutral-200 transition-all duration-300 dark:border-white/[0.08] ${
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
              className="text-sm text-neutral-600 transition-colors hover:text-neutral-950 dark:text-slate-400 dark:hover:text-white"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/sign-up"
              onClick={() => setOpen(false)}
              className="text-sm font-medium text-sky-300 transition-colors hover:text-sky-200"
            >
              Empieza prueba gratuita
            </Link>
          </div>
        </nav>

        <div
          className={`border-t border-neutral-200 px-6 py-5 transition-all duration-300 ease-out dark:border-white/[0.08] ${
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
              className="min-w-0 flex-1 rounded-lg border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-sm text-neutral-950 outline-none placeholder:text-neutral-500 focus:border-sky-400 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:placeholder:text-slate-500"
            />
            <button
              type="submit"
              className="shrink-0 rounded-lg bg-sky-400 px-4 py-2.5 text-sm font-medium text-slate-950 transition-colors hover:bg-sky-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
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
