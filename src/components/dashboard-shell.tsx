'use client';

import { useState } from 'react';
import Navbar from './navbar';
import Sidebar from './sidebar';

// ──────────────────────────────────────────────
// DashboardShell
// ──────────────────────────────────────────────
// Layout principal del dashboard. Gestiona el estado
// del sidebar móvil: sidebarOpen se alterna desde el
// botón hamburguesa en Navbar y se cierra al hacer
// clic fuera o navegar a otra ruta (onClose en Sidebar).
//
// Estructura:
//   ┌──────────────────────────────────┐
//   │  Navbar (h-14, fijo arriba)      │
//   ├──────────┬───────────────────────┤
//   │  Sidebar │  <main>               │
//   │  (220px) │  children             │
//   │          │                       │
//   └──────────┴───────────────────────┘
// ──────────────────────────────────────────────
const DashboardShell = ({ children }: { children: React.ReactNode }) => {
  // Estado del sidebar móvil: false = cerrado, true = abierto
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-dvh flex-col bg-[#F5F7FA] text-neutral-950 dark:bg-[#0B0D12] dark:text-neutral-100">
      {/* Navbar: pasa el toggle para abrir/cerrar el sidebar móvil */}
      <Navbar
        mobileOpen={sidebarOpen}
        onMenuToggle={() => setSidebarOpen((prev) => !prev)}
      />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Sidebar: recibe el estado y un callback para cerrar */}
        <Sidebar
          mobileOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        {/* Contenido principal de cada página */}
        <main className="min-w-0 flex-1 overflow-y-auto bg-[#F5F7FA] transition-colors dark:bg-[#0B0D12]">
          <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardShell;
