// ──────────────────────────────────────────────
// DarkToggle — Test Suite
// ──────────────────────────────────────────────
// Prueba unitaria del componente DarkToggle.
//
// Mockea localStorage para simular persistencia del tema.
// Verifica que el componente:
//   - Renderice correctamente el botón
//   - Cambie de icono según el estado (luna ↔ sol)
//   - Lea y escriba en localStorage
//   - Aplique/remueva la clase .dark en <html>
// ──────────────────────────────────────────────

import { render, screen, fireEvent } from '@testing-library/react';
import DarkToggle from '../dark-toggle';

// ─── Mock de localStorage ─────────────────────
// Simula un almacenamiento clave-valor en memoria.
// Todos los métodos son jest.fn() para poder espiarlos.
const createMockStorage = () => {
  const store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] ?? null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      Object.keys(store).forEach((k) => delete store[k]);
    }),
  };
};

const mockStorage = createMockStorage();

// Reemplaza el localStorage global por nuestro mock
Object.defineProperty(window, 'localStorage', {
  value: mockStorage,
  writable: true,
});

describe('DarkToggle', () => {
  // Resetea el estado entre tests para evitar contaminación
  beforeEach(() => {
    mockStorage.clear();
    jest.clearAllMocks();
    document.documentElement.classList.remove('dark');
  });

  // ─── Render básico ──────────────────────────

  it('renders a toggle button with correct aria-label', () => {
    // El botón debe tener aria-label="Cambiar modo" para accesibilidad
    render(<DarkToggle />);
    expect(
      screen.getByRole('button', { name: /cambiar modo/i }),
    ).toBeInTheDocument();
  });

  // ─── Iconos según estado ────────────────────

  it('renders moon icon when dark mode is off', () => {
    // Por defecto (dark=false) debe mostrar el icono de luna
    // El path de la luna contiene "20.354" en su atributo d
    render(<DarkToggle />);
    const svg = screen.getByRole('button').querySelector('svg');
    expect(svg).toBeInTheDocument();
    const path = svg!.querySelector('path');
    expect(path).toHaveAttribute(
      'd',
      expect.stringContaining('20.354'),
    );
  });

  it('renders sun icon when dark mode is on', () => {
    // Si localStorage tiene "dark", al montar debe mostrar el icono de sol
    // El path del sol contiene "M12 3" en su atributo d
    mockStorage.getItem.mockReturnValue('dark');
    render(<DarkToggle />);
    const svg = screen.getByRole('button').querySelector('svg');
    const path = svg!.querySelector('path');
    expect(path).toHaveAttribute('d', expect.stringContaining('M12 3'));
  });

  // ─── Lectura de localStorage ────────────────

  it('reads theme from localStorage on mount', () => {
    // Al montar, debe llamar a localStorage.getItem('theme')
    render(<DarkToggle />);
    expect(mockStorage.getItem).toHaveBeenCalledWith('theme');
  });

  // ─── Clase .dark en <html> ──────────────────

  it('applies dark class to html when stored theme is dark', () => {
    // Si el tema guardado es "dark", debe agregar .dark a <html>
    mockStorage.getItem.mockReturnValue('dark');
    render(<DarkToggle />);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('does not apply dark class when stored theme is light', () => {
    // Si el tema guardado es "light", NO debe agregar .dark a <html>
    mockStorage.getItem.mockReturnValue('light');
    render(<DarkToggle />);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  // ─── Toggle ─────────────────────────────────

  it('toggles to dark on click and persists to localStorage', () => {
    // Al hacer clic estando en light:
    //   1. Debe agregar .dark a <html>
    //   2. Debe guardar "dark" en localStorage
    render(<DarkToggle />);
    fireEvent.click(screen.getByRole('button'));
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(mockStorage.setItem).toHaveBeenCalledWith('theme', 'dark');
  });

  it('toggles back to light on second click', () => {
    // Dos clics: light → dark → light
    //   1. Primer clic: dark (true)
    //   2. Segundo clic: light (false) + guarda "light"
    render(<DarkToggle />);
    const btn = screen.getByRole('button');

    fireEvent.click(btn);
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    fireEvent.click(btn);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(mockStorage.setItem).toHaveBeenCalledWith('theme', 'light');
  });
});
