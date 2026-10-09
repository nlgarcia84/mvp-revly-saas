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

      <div
        id="mobile-navigation"
        className={`fixed left-0 right-0 z-50 flex flex-col border-b border-white/[0.08] bg-[#0B0D12] transition-all duration-300 ease-out ${
          open
            ? 'visible opacity-100 bottom-0 top-[61px]'
            : 'invisible opacity-0 bottom-0 top-[61px]'
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
                  className="block py-3 text-xl font-medium text-white transition-colors hover:text-sky-300"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          <hr
            className={`my-6 border-white/[0.08] transition-all duration-300 ${
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
              className="text-sm text-slate-400 transition-colors hover:text-white"
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
          className={`border-t border-white/[0.08] px-6 py-5 transition-all duration-300 ease-out ${
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
              className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-sky-400"
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
