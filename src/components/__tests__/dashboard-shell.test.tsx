// ──────────────────────────────────────────────
// DashboardShell — Test Suite
// ──────────────────────────────────────────────
// Prueba unitaria del componente DashboardShell.
//
// Mockea:
//   - navbar — para espiar onMenuToggle sin dependencias
//   - sidebar — para espiar mobileOpen y onClose mediante data-atributos
//
// Estrategia:
//   En lugar de renderizar Navbar y Sidebar reales (que tienen sus propias
//   dependencias complejas), usamos mocks que exponen data-testid y
//   data-atributos para verificar el estado interno del DashboardShell.
//
// Cobertura:
//   - Render de la estructura completa (Navbar + Sidebar + children)
//   - Estado inicial del sidebar
//   - Apertura/cierre del sidebar
//   - Toggle alternado
// ──────────────────────────────────────────────

import { render, screen, fireEvent } from '@testing-library/react';
import DashboardShell from '../dashboard-shell';

// Mock del Navbar: renderiza un botón que ejecuta onMenuToggle al hacer clic
jest.mock('../navbar', () => ({
  __esModule: true,
  default: ({ onMenuToggle }: { onMenuToggle: () => void }) => (
    <button data-testid="navbar" onClick={onMenuToggle}>
      Navbar
    </button>
  ),
}));

// Mock del Sidebar: expone mobileOpen como data-mobile-open y un botón
// que ejecuta onClose para simular el cierre desde el overlay/links
jest.mock('../sidebar', () => ({
  __esModule: true,
  default: ({
    mobileOpen,
    onClose,
  }: {
    mobileOpen: boolean;
    onClose: () => void;
  }) => (
    <div data-testid="sidebar" data-mobile-open={String(mobileOpen)}>
      <button data-testid="close-sidebar" onClick={onClose}>
        Close
      </button>
    </div>
  ),
}));

describe('DashboardShell', () => {
  it('renders Navbar, Sidebar and children', () => {
    // Verifica que los tres elementos estén presentes en el DOM
    render(
      <DashboardShell>
        <div data-testid="child">Content</div>
      </DashboardShell>,
    );
    expect(screen.getByTestId('navbar')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('starts with sidebar closed', () => {
    // Estado inicial: sidebarOpen = false → data-mobile-open = "false"
    render(
      <DashboardShell>
        <div />
      </DashboardShell>,
    );
    expect(screen.getByTestId('sidebar')).toHaveAttribute(
      'data-mobile-open',
      'false',
    );
  });

  it('opens sidebar when the menu toggle is clicked', () => {
    // Al hacer clic en el Navbar (que dispara onMenuToggle),
    // sidebarOpen debe pasar a true → data-mobile-open = "true"
    render(
      <DashboardShell>
        <div />
      </DashboardShell>,
    );
    fireEvent.click(screen.getByTestId('navbar'));
    expect(screen.getByTestId('sidebar')).toHaveAttribute(
      'data-mobile-open',
      'true',
    );
  });

  it('closes sidebar when onClose is triggered', () => {
    // 1. Abrir sidebar (clic en navbar)
    // 2. Cerrar sidebar (clic en close-sidebar que ejecuta onClose)
    // Resultado esperado: data-mobile-open = "false"
    render(
      <DashboardShell>
        <div />
      </DashboardShell>,
    );

    fireEvent.click(screen.getByTestId('navbar'));
    expect(screen.getByTestId('sidebar')).toHaveAttribute(
      'data-mobile-open',
      'true',
    );

    fireEvent.click(screen.getByTestId('close-sidebar'));
    expect(screen.getByTestId('sidebar')).toHaveAttribute(
      'data-mobile-open',
      'false',
    );
  });

  it('toggles sidebar alternately on repeated clicks', () => {
    // Verifica el toggle: cada clic cambia el estado
    // false → true → false → true
    render(
      <DashboardShell>
        <div />
      </DashboardShell>,
    );
    const navbar = screen.getByTestId('navbar');

    fireEvent.click(navbar);
    expect(screen.getByTestId('sidebar')).toHaveAttribute(
      'data-mobile-open',
      'true',
    );

    fireEvent.click(navbar);
    expect(screen.getByTestId('sidebar')).toHaveAttribute(
      'data-mobile-open',
      'false',
    );

    fireEvent.click(navbar);
    expect(screen.getByTestId('sidebar')).toHaveAttribute(
      'data-mobile-open',
      'true',
    );
  });
});
