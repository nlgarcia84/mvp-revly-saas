import Link from 'next/link';

// ─── Variantes visuales ──────────────────────────
// primary   → fondo negro, texto blanco (CTA principal)
// secondary → fondo blanco, borde gris (acción secundaria)
// ─────────────────────────────────────────────────
type Variant = 'primary' | 'secondary';

const variantClass: Record<Variant, string> = {
  primary:
    'border-neutral-950 bg-neutral-950 text-white border-sky-400 bg-sky-400 text-slate-950 shadow-sm shadow-sky-950/20 hover:-translate-y-0.5 hover:border-sky-300 hover:bg-sky-300',
  secondary:
    'border-neutral-200 bg-white text-neutral-950 border-white/15 bg-white/[0.04] text-slate-200 shadow-sm hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/[0.08] hover:text-white',
};

// ─── Clases base comunes a todas las variantes ───
const baseClass =
  'inline-flex cursor-pointer items-center justify-center gap-2 rounded-full border px-5 py-2.5 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0D12] disabled:cursor-not-allowed disabled:opacity-50';

// ─── Tipos para los tres modos de render ─────────
// as="button" (default) → <button>
// as="link"             → <Link> de Next.js
// as="a"                → <a> nativo
// ─────────────────────────────────────────────────
type ButtonProps = {
  variant?: Variant;
  className?: string;
  children: React.ReactNode;
};

// Cada modo extiende las props nativas del elemento que renderiza,
// permitiendo pasar onClick, href, target, disabled, etc. directamente.
type ButtonAsButton = ButtonProps &
  React.ButtonHTMLAttributes<HTMLButtonElement> & { as?: 'button' };

type ButtonAsLink = ButtonProps &
  React.ComponentPropsWithoutRef<typeof Link> & { as: 'link' };

type ButtonAsAnchor = ButtonProps &
  React.AnchorHTMLAttributes<HTMLAnchorElement> & { as: 'a' };

// La unión de tipos hace que TS infiera automáticamente qué props
// son válidas según el valor de `as`.
type Props = ButtonAsButton | ButtonAsLink | ButtonAsAnchor;

const Button = (props: Props) => {
  // Extrae las props comunes y el resto se pasa al elemento nativo
  const {
    variant = 'primary',
    className = '',
    children,
    ...rest
  } = props;

  // Combina clases base + variante + clases personalizadas
  const cls = `${baseClass} ${variantClass[variant]} ${className}`;

  // Render como Link de Next.js (navegación interna)
  // Descarta as, variant y className para no pasarlos al DOM
  if (props.as === 'link') {
    const { as: _, variant: _v, className: _c, ...linkRest } = props as ButtonAsLink;
    return (
      <Link className={cls} {...linkRest}>
        {children}
      </Link>
    );
  }

  // Render como <a> nativo (links externos, target="_blank", etc.)
  if (props.as === 'a') {
    const { as: _, variant: _v, className: _c, ...anchorRest } = props as ButtonAsAnchor;
    return (
      <a className={cls} {...anchorRest}>
        {children}
      </a>
    );
  }

  // Render como <button> (formularios, modales, etc.)
  // Es el caso por defecto cuando as no se especifica
  const { as: _, variant: _v, className: _c, ...buttonRest } = props as ButtonAsButton;
  return (
    <button className={cls} {...buttonRest}>
      {children}
    </button>
  );
};

export default Button;
