'use client';

// ─── Gráficos neon ────────────────────────────────
// Sistema visual de los gráficos del dashboard: mismo lenguaje
// "tubo de neón" (núcleo brillante + halo difuso) en lugar de
// rellenos planos.
//
// El halo se consigue con dos capas SVG: un trazo grueso y
// translúcido pasado por un feGaussianBlur (la luz que se derrama
// alrededor) y encima el trazo fino con degradado (el tubo). Las
// barras horizontales reproducen el mismo efecto con box-shadow.
//
// Todos los ids de <defs> se generan con useId para que varias
// instancias convivan sin pisarse los degradados y filtros.
// ────────────────────────────────────────────────────

import { useEffect, useId, useState } from 'react';

const TAU = Math.PI * 2;

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

// Convierte "#rgb" o "#rrggbb" en componentes RGB. Si el color no
// es un hex válido se devuelve null y se usa el color tal cual.
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const raw = hex.trim().replace('#', '');
  const full =
    raw.length === 3
      ? raw
          .split('')
          .map((c) => c + c)
          .join('')
      : raw;
  if (!/^[0-9a-f]{6}$/i.test(full)) return null;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

// Versión más clara del color: el núcleo del tubo tiene que
// acercarse al blanco para que parezca iluminado.
export function lighten(hex: string, amount = 0.5): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  return `rgb(${mix(rgb.r)}, ${mix(rgb.g)}, ${mix(rgb.b)})`;
}

// El mismo color con alpha: se usa para halos y sombras.
export function withAlpha(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

// ─── Anillo neon (medidor circular) ─────────────────────

type NeonDonutProps = {
  /** Porcentaje a representar, de 0 a 1. */
  value: number;
  /** Color base del tubo. */
  color: string;
  /** Diámetro exterior en píxeles. */
  size?: number;
  /** Grosor del trazo en píxeles. */
  thickness?: number;
  /** Duración de la animación de barrido, en milisegundos. */
  duration?: number;
  className?: string;
  /** Contenido centrado dentro del anillo. */
  children?: React.ReactNode;
};

export function NeonDonut({
  value,
  color,
  size = 80,
  thickness = 9,
  duration = 1100,
  className = '',
  children,
}: NeonDonutProps) {
  const uid = useId().replace(/:/g, '');
  const target = clamp01(value);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setProgress(target));
    return () => cancelAnimationFrame(frame);
  }, [target]);

  const radius = (size - thickness) / 2;
  const circumference = TAU * radius;
  const offset = circumference * (1 - progress);
  const center = size / 2;
  const ease = `stroke-dashoffset ${duration}ms cubic-bezier(0.16, 1, 0.3, 1)`;

  return (
    <div
      className={`relative shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`${uid}-core`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={lighten(color, 0.6)} />
            <stop offset="45%" stopColor={color} />
            <stop offset="100%" stopColor={lighten(color, 0.15)} />
          </linearGradient>
          <filter
            id={`${uid}-halo`}
            x="-80%"
            y="-80%"
            width="260%"
            height="260%"
          >
            <feGaussianBlur stdDeviation={thickness * 0.75} />
          </filter>
        </defs>

        <g transform={`rotate(-90 ${center} ${center})`}>
          {/* Pista: el anillo apagado sobre el que se dibuja el valor. */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="#1f1f1f"
            strokeWidth={thickness}
          />

          {/* Halo: el mismo trazo, difuminado. Es la luz que se derrama. */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={thickness}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            opacity={0.75}
            filter={`url(#${uid}-halo)`}
            className="neon-halo"
            style={{ transition: ease }}
          />

          {/* Tubo: el trazo fino con degradado que hace de núcleo. */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={`url(#${uid}-core)`}
            strokeWidth={thickness}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: ease }}
          />
        </g>
      </svg>
      {children ? (
        <div className="absolute inset-0 flex items-center justify-center">
          {children}
        </div>
      ) : null}
    </div>
  );
}

// ─── Barra neon ─────────────────────────────────────────

type NeonBarProps = {
  /** Valor a representar, de 0 a 1. */
  value: number;
  /** Color base del tubo. */
  color: string;
  /** Altura de la barra en píxeles. */
  height?: number;
  className?: string;
};

export function NeonBar({
  value,
  color,
  height = 8,
  className = '',
}: NeonBarProps) {
  const pct = clamp01(value) * 100;

  return (
    <div
      className={`relative w-full rounded-full bg-neutral-100 dark:bg-neutral-800 ${className}`}
      style={{ height }}
    >
      <div
        className="absolute inset-y-0 left-0 rounded-full"
        style={{
          width: `${pct}%`,
          background: `linear-gradient(90deg, ${withAlpha(color, 0.3)}, ${color} 55%, ${lighten(color, 0.5)})`,
          boxShadow: `0 0 6px ${withAlpha(color, 0.55)}, 0 0 14px ${withAlpha(color, 0.28)}`,
          transition: 'width 600ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      />
    </div>
  );
}

// ─── Barra apilada neon ────────────────────────────────

type NeonSegment = {
  /** Peso del segmento, en la misma unidad que el resto. */
  value: number;
  /** Color base del segmento. */
  color: string;
  /** Etiqueta opcional para lectores de pantalla. */
  label?: string;
};

type NeonStackedBarProps = {
  segments: NeonSegment[];
  height?: number;
  className?: string;
};

/**
 * Barra dividida en tramos contiguos, cada uno con su propio halo.
 * Los tramos se posicionan por porcentaje acumulado para que la
 * barra se lea como una sola línea de luz con distintos colores.
 */
export function NeonStackedBar({
  segments,
  height = 8,
  className = '',
}: NeonStackedBarProps) {
  const total = segments.reduce((sum, s) => sum + Math.max(0, s.value), 0);
  let cursor = 0;

  return (
    <div
      className={`relative w-full rounded-full bg-neutral-100 dark:bg-neutral-800 ${className}`}
      style={{ height }}
    >
      {total > 0 &&
        segments.map((segment, index) => {
          const width = (Math.max(0, segment.value) / total) * 100;
          const left = cursor;
          cursor += width;
          if (width <= 0) return null;
          return (
            <div
              key={segment.label ?? index}
              className="absolute inset-y-0"
              style={{
                left: `${left}%`,
                width: `${width}%`,
                background: `linear-gradient(90deg, ${withAlpha(segment.color, 0.35)}, ${segment.color} 60%, ${lighten(segment.color, 0.4)})`,
                boxShadow: `0 0 6px ${withAlpha(segment.color, 0.5)}, 0 0 14px ${withAlpha(segment.color, 0.25)}`,
                transition: 'left 600ms cubic-bezier(0.16, 1, 0.3, 1), width 600ms cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            />
          );
        })}
    </div>
  );
}

// ─── Punto de leyenda neon ─────────────────────────────

type NeonDotProps = {
  color: string;
  className?: string;
};

/** Punto de leyenda con halo, para acompañar a las barras neon. */
export function NeonDot({ color, className = '' }: NeonDotProps) {
  return (
    <span
      className={`neon-dot inline-block h-2 w-2 rounded-full align-middle ${className}`}
      style={{
        backgroundColor: color,
        boxShadow: `0 0 5px ${withAlpha(color, 0.8)}, 0 0 10px ${withAlpha(color, 0.4)}`,
      }}
    />
  );
}

// ─── Anillo de carga neon ──────────────────────────────

type NeonSpinnerProps = {
  size?: number;
  color?: string;
  thickness?: number;
  className?: string;
};

/**
 * Anillo giratorio con halo: el estado de carga usa el mismo
 * lenguaje visual que los gráficos, para que el bloque no cambie
 * de estética mientras llegan los datos.
 */
export function NeonSpinner({
  size = 96,
  color = '#a78bfa',
  thickness = 4,
  className = '',
}: NeonSpinnerProps) {
  const uid = useId().replace(/:/g, '');
  const radius = (size - thickness) / 2;
  const circumference = TAU * radius;

  return (
    <div
      className={`shrink-0 ${className}`}
      style={{ width: size, height: size }}
      role="status"
      aria-label="Cargando"
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden="true"
        className="animate-spin"
      >
        <defs>
          <filter
            id={`${uid}-halo`}
            x="-80%"
            y="-80%"
            width="260%"
            height="260%"
          >
            <feGaussianBlur stdDeviation={thickness * 1.4} />
          </filter>
        </defs>

        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#1f1f1f"
          strokeWidth={thickness}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={`${circumference * 0.22} ${circumference}`}
          opacity={0.9}
          filter={`url(#${uid}-halo)`}
        />
      </svg>
    </div>
  );
}
