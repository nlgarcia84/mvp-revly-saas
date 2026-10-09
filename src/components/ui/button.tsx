import Link from 'next/link';

// ─── Variantes visuales ──────────────────────────
// primary   → fondo negro, texto blanco (CTA principal)
// secondary → fondo blanco, borde gris (acción secundaria)
// ─────────────────────────────────────────────────
type Variant = 'primary' | 'secondary';

const variantClass: Record<Variant, string> = {
  primary:
    'border-neutral-950 bg-neutral-950 text-white shadow-[3px_3px_7px_rgba(0,0,0,0.22),-2px_-2px_5px_rgba(255,255,255,0.08)] hover:border-neutral-800 hover:bg-neutral-800 hover:shadow-[4px_4px_10px_rgba(0,0,0,0.26),-2px_-2px_5px_rgba(255,255,255,0.1)] active:translate-y-px active:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.28)] dark:border-[#303847] dark:bg-[#151922] dark:text-neutral-100 dark:shadow-[3px_3px_8px_rgba(0,0,0,0.32)] dark:hover:border-[#3B4658] dark:hover:bg-[#1B202B]',
  secondary:
    'border-neutral-200 bg-white text-neutral-950 shadow-[3px_3px_7px_rgba(163,163,163,0.3),-2px_-2px_5px_rgba(255,255,255,0.9)] hover:bg-neutral-50 hover:border-neutral-300 active:translate-y-px active:shadow-[inset_2px_2px_4px_rgba(163,163,163,0.22)] dark:border-[#303847] dark:bg-[#151922] dark:text-neutral-100 dark:shadow-[3px_3px_8px_rgba(0,0,0,0.28)] dark:hover:bg-[#1B202B]',
};

// ─── Clases base comunes a todas las variantes ───
const baseClass =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-md border px-[18px] py-2.5 text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer';

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
