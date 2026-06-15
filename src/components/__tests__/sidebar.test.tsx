// ──────────────────────────────────────────────
// Sidebar — Test Suite
// ──────────────────────────────────────────────
// Prueba unitaria del componente Sidebar.
//
// Mockea:
//   - next/navigation (usePathname) — para controlar la ruta activa
//
// Cobertura:
//   - Render de los 4 links de navegación
//   - Estado activo/inactivo según la ruta actual
//   - Panel móvil: overlay, translate, onClose
//   - Sidebar desktop
// ──────────────────────────────────────────────

import { render, screen, fireEvent } from '@testing-library/react';
import Sidebar from '../sidebar';

// Mock de usePathname: devuelve el valor que configuremos con mockPathname
const mockPathname = jest.fn();
jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
}));

// Links esperados — deben coincidir con los del sidebar.tsx
const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/business', label: 'Negocios' },
  { href: '/pricing', label: 'Planes' },
  { href: '/profile', label: 'Perfil' },
];

describe('Sidebar', () => {
  // Ruta activa por defecto para todos los tests
  beforeEach(() => {
    mockPathname.mockReturnValue('/dashboard');
  });

  // ─── Links de navegación ────────────────────

  // Test generado dinámicamente para cada link del array
  NAV_LINKS.forEach(({ label }) => {
    it(`renders the "${label}" navigation link`, () => {
      // Cada link aparece 2 veces: una en el sidebar móvil y otra en el desktop
      render(<Sidebar mobileOpen={false} onClose={jest.fn()} />);
      expect(screen.getAllByText(label).length).toBe(2);
    });
  });

  // ─── Estado activo ──────────────────────────

  it('applies active styles to the current route link', () => {
    // Con pathname = "/dashboard", el link "Dashboard" debe tener
    // las clases de activo: font-medium, bg-white
    render(<Sidebar mobileOpen={false} onClose={jest.fn()} />);
    screen.getAllByText('Dashboard').forEach((link) => {
      expect(link.className).toContain('font-medium');
      expect(link.className).toContain('bg-white');
    });
  });

  it('does not apply active styles to other route links', () => {
    // Con pathname = "/pricing", "Dashboard" debe tener clase inactivo: bg-transparent
    mockPathname.mockReturnValue('/pricing');
    render(<Sidebar mobileOpen={false} onClose={jest.fn()} />);
    screen.getAllByText('Dashboard').forEach((link) => {
      expect(link.className).toContain('bg-transparent');
    });
  });

  // ─── Panel móvil ────────────────────────────

  it('renders the mobile overlay when mobileOpen is true', () => {
    // mobileOpen=true debe renderizar el overlay semitransparente (fixed inset-0)
    const { container } = render(
      <Sidebar mobileOpen={true} onClose={jest.fn()} />,
    );
    const overlay = container.querySelector('.fixed.inset-0');
    expect(overlay).toBeInTheDocument();
  });

  it('translates mobile panel into view when open', () => {
    // mobileOpen=true → translate-x-0 (panel visible)
    const { container } = render(
      <Sidebar mobileOpen={true} onClose={jest.fn()} />,
    );
    const mobileAside = container.querySelector('aside.lg\\:hidden');
    expect(mobileAside?.className).toContain('translate-x-0');
  });

  it('translates mobile panel out of view when closed', () => {
    // mobileOpen=false → -translate-x-full (panel oculto fuera de la pantalla)
    const { container } = render(
      <Sidebar mobileOpen={false} onClose={jest.fn()} />,
    );
    const mobileAside = container.querySelector('aside.lg\\:hidden');
    expect(mobileAside?.className).toContain('-translate-x-full');
  });

  it('calls onClose when the overlay is clicked', () => {
    // Al hacer clic en el overlay oscuro, debe ejecutar onClose
    const onClose = jest.fn();
    const { container } = render(
      <Sidebar mobileOpen={true} onClose={onClose} />,
    );
    const overlay = container.querySelector('.fixed.inset-0');
    fireEvent.click(overlay!);
    expect(onClose).toHaveBeenCalled();
  });

  // ─── Sidebar desktop ────────────────────────

  it('renders the desktop sidebar', () => {
    // El sidebar desktop tiene clase "hidden lg:block"
    const { container } = render(
      <Sidebar mobileOpen={false} onClose={jest.fn()} />,
    );
    const desktopAside = container.querySelector('aside.hidden');
    expect(desktopAside).toBeInTheDocument();
    expect(desktopAside?.className).toContain('lg:block');
  });
});
