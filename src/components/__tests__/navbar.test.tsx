// ──────────────────────────────────────────────
// Navbar — Test Suite
// ──────────────────────────────────────────────
// Prueba unitaria del componente Navbar.
//
// Mockea:
//   - @/actions/auth (signOut) — Server Action de cierre de sesión
//   - @/components/ui/dark-toggle — componente hijo
//   - Temporizadores (useFakeTimers) — para controlar el reloj
//
// Cobertura:
//   - Render de elementos (brand, reloj, DarkToggle, cerrar sesión)
//   - Interacción (hamburger toggle)
//   - Efectos secundarios (intervalo, limpieza)
// ──────────────────────────────────────────────

import { render, screen, fireEvent } from '@testing-library/react';
import Navbar from '../navbar';

// Mock de la Server Action signOut para evitar que intente conectarse a Supabase
jest.mock('@/actions/auth', () => ({
  signOut: jest.fn(),
}));

// Mock del DarkToggle: reemplazamos el componente real por un botón simple
// con data-testid para poder verificarlo en el test
jest.mock('@/components/ui/dark-toggle', () => ({
  __esModule: true,
  default: () => <button data-testid="dark-toggle">Toggle</button>,
}));

describe('Navbar', () => {
  // Configura temporizadores falsos para controlar el reloj
  // Fija la fecha al 15 de enero de 2025 a las 14:30
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-01-15T14:30:00'));
  });

  // Restaura temporizadores reales después de cada test
  afterEach(() => {
    jest.useRealTimers();
  });

  // ─── Render de elementos ────────────────────

  it('renders the Revly brand name', () => {
    render(<Navbar onMenuToggle={jest.fn()} />);
    expect(screen.getByText('Revly')).toBeInTheDocument();
  });

  it('renders the current date and time', () => {
    // Con la fecha fijada, debe mostrar "ene" (abrev. de enero) y "14:30"
    render(<Navbar onMenuToggle={jest.fn()} />);
    expect(screen.getByText(/ene/i)).toBeInTheDocument();
    expect(screen.getByText(/14:30/i)).toBeInTheDocument();
  });

  it('renders the DarkToggle component', () => {
    // Verifica que el mock del DarkToggle se renderice dentro del Navbar
    render(<Navbar onMenuToggle={jest.fn()} />);
    expect(screen.getByTestId('dark-toggle')).toBeInTheDocument();
  });

  it('renders the sign out button', () => {
    render(<Navbar onMenuToggle={jest.fn()} />);
    expect(
      screen.getByRole('button', { name: /cerrar sesión/i }),
    ).toBeInTheDocument();
  });

  // ─── Interacciones ──────────────────────────

  it('calls onMenuToggle when hamburger button is clicked', () => {
    // El botón hamburguesa debe disparar el callback onMenuToggle
    const onMenuToggle = jest.fn();
    render(<Navbar onMenuToggle={onMenuToggle} />);
    fireEvent.click(screen.getByLabelText('Abrir menú'));
    expect(onMenuToggle).toHaveBeenCalledTimes(1);
  });

  // ─── Efectos secundarios ────────────────────

  it('updates the clock every 30 seconds', () => {
    // El reloj debe actualizarse después de 30 segundos
    render(<Navbar onMenuToggle={jest.fn()} />);
    jest.advanceTimersByTime(30_000);
    expect(screen.getByText(/14:30/i)).toBeInTheDocument();
  });

  it('cleans up the interval on unmount', () => {
    // Al desmontar el componente, debe limpiar el intervalo
    // para evitar memory leaks (llamar a clearInterval)
    const clearSpy = jest.spyOn(global, 'clearInterval');
    const { unmount } = render(<Navbar onMenuToggle={jest.fn()} />);
    unmount();
    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();
  });
});
