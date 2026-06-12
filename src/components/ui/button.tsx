import Link from 'next/link';

// ─── Variantes visuales ──────────────────────────
// primary   → fondo negro, texto blanco (CTA principal)
// secondary → fondo blanco, borde gris (acción secundaria)
// ─────────────────────────────────────────────────
type Variant = 'primary' | 'secondary';

const variantClass: Record<Variant, string> = {
  primary:
    'border-neutral-950 bg-neutral-950 text-white hover:bg-neutral-800 hover:border-neutral-800',
  secondary:
    'border-neutral-200 bg-white text-neutral-950 hover:bg-neutral-100 hover:border-neutral-300',
};

// ─── Clases base comunes a todas las variantes ───
const baseClass =
  'inline-flex items-center justify-center gap-2 px-[18px] py-2.5 rounded-md text-sm font-medium border transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed';

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

type ButtonAsButton = ButtonProps &
  React.ButtonHTMLAttributes<HTMLButtonElement> & { as?: 'button' };

type ButtonAsLink = ButtonProps &
  React.ComponentPropsWithoutRef<typeof Link> & { as: 'link' };

type ButtonAsAnchor = ButtonProps &
  React.AnchorHTMLAttributes<HTMLAnchorElement> & { as: 'a' };

type Props = ButtonAsButton | ButtonAsLink | ButtonAsAnchor;

const Button = (props: Props) => {
  const {
    variant = 'primary',
    className = '',
    children,
    ...rest
  } = props;

  const cls = `${baseClass} ${variantClass[variant]} ${className}`;

  // Render como Link de Next.js
  if (props.as === 'link') {
    const { as: _, variant: _v, className: _c, ...linkRest } = props as ButtonAsLink;
    return (
      <Link className={cls} {...linkRest}>
        {children}
      </Link>
    );
  }

  // Render como <a> nativo (links externos)
  if (props.as === 'a') {
    const { as: _, variant: _v, className: _c, ...anchorRest } = props as ButtonAsAnchor;
    return (
      <a className={cls} {...anchorRest}>
        {children}
      </a>
    );
  }

  // Render como <button> (formularios, modales, etc.)
  const { as: _, variant: _v, className: _c, ...buttonRest } = props as ButtonAsButton;
  return (
    <button className={cls} {...buttonRest}>
      {children}
    </button>
  );
};

export default Button;
