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
    <div className="flex flex-col h-screen">
      {/* Navbar: pasa el toggle para abrir/cerrar el sidebar móvil */}
      <Navbar onMenuToggle={() => setSidebarOpen((prev) => !prev)} />
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar: recibe el estado y un callback para cerrar */}
        <Sidebar
          mobileOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        {/* Contenido principal de cada página */}
        <main className="flex-1 p-5 sm:p-6 lg:p-8 overflow-y-auto bg-neutral-100 dark:bg-neutral-900 transition-colors">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardShell;
