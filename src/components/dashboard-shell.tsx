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
    <div className="flex h-dvh min-w-0 flex-col overflow-hidden bg-neutral-50 dark:bg-[#050505]">
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
        <main className="dashboard-surface min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-3 transition-colors sm:p-5 lg:p-7 xl:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardShell;
