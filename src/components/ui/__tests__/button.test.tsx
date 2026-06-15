// ──────────────────────────────────────────────
// Button — Test Suite
// ──────────────────────────────────────────────
// Prueba unitaria del componente Button.
//
// Cobertura:
//   - 3 modos de render (button, link, anchor)
//   - 2 variantes visuales (primary, secondary)
//   - Personalización (className)
//   - Eventos (onClick)
//   - Estados (disabled)
//   - Children
//   - Propagación de atributos HTML
// ──────────────────────────────────────────────

import { render, screen, fireEvent } from '@testing-library/react';
import Button from '../button';

describe('Button', () => {
  // ─── Modos de render ────────────────────────

  it('renders as button element by default', () => {
    // Sin prop "as", debe renderizar un <button>
    render(<Button>Click me</Button>);
    const btn = screen.getByRole('button', { name: /click me/i });
    expect(btn).toBeInTheDocument();
    expect(btn.tagName).toBe('BUTTON');
  });

  it('renders as button with explicit as="button"', () => {
    // as="button" explícito debe renderizar <button>
    render(<Button as="button">Click</Button>);
    expect(screen.getByRole('button', { name: /click/i })).toBeInTheDocument();
  });

  it('renders as Next.js Link when as="link"', () => {
    // as="link" debe renderizar un <a> (Next.js Link genera <a> en el DOM)
    render(
      <Button as="link" href="/test">
        Go
      </Button>,
    );
    const link = screen.getByRole('link', { name: /go/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/test');
  });

  it('renders as native anchor when as="a"', () => {
    // as="a" debe renderizar un <a> nativo con el href correspondiente
    render(
      <Button as="a" href="https://example.com">
        External
      </Button>,
    );
    const anchor = screen.getByRole('link', { name: /external/i });
    expect(anchor).toBeInTheDocument();
    expect(anchor).toHaveAttribute('href', 'https://example.com');
  });

  // ─── Variantes visuales ─────────────────────

  it('applies primary variant classes by default', () => {
    // Sin variant, debe aplicar primary: bg-neutral-950 + text-white
    render(<Button>Primary</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('bg-neutral-950');
    expect(btn.className).toContain('text-white');
  });

  it('applies secondary variant classes', () => {
    // variant="secondary" debe aplicar bg-white + text-neutral-950
    render(<Button variant="secondary">Secondary</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('bg-white');
    expect(btn.className).toContain('text-neutral-950');
  });

  // ─── Personalización ────────────────────────

  it('merges custom className with default classes', () => {
    // className adicional debe concatenarse sin reemplazar las clases base
    render(<Button className="my-custom-class">Custom</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('my-custom-class');
    expect(btn.className).toContain('bg-neutral-950');
  });

  // ─── Eventos ────────────────────────────────

  it('forwards onClick handler', () => {
    // onClick debe ejecutarse al hacer clic en el botón
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  // ─── Estados ────────────────────────────────

  it('respects disabled attribute', () => {
    // disabled debe propagarse al <button> y hacerlo no interactivo
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  // ─── Children ───────────────────────────────

  it('renders children content', () => {
    // El contenido children debe aparecer dentro del botón
    render(
      <Button>
        <span data-testid="child">Child</span>
      </Button>,
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  // ─── Atributos HTML ─────────────────────────

  it('forwards additional HTML attributes to button', () => {
    // Atributos como type, data-* deben propagarse al elemento raíz
    render(
      <Button type="submit" data-testid="submit-btn">
        Submit
      </Button>,
    );
    expect(screen.getByTestId('submit-btn')).toHaveAttribute('type', 'submit');
  });

  it('forwards target and rel to anchor element', () => {
    // target="_blank" y rel="noopener" deben propagarse al <a>
    render(
      <Button as="a" href="https://example.com" target="_blank" rel="noopener">
        Ext
      </Button>,
    );
    const anchor = screen.getByRole('link');
    expect(anchor).toHaveAttribute('target', '_blank');
    expect(anchor).toHaveAttribute('rel', 'noopener');
  });
});
