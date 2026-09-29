// Reglas del programa de puntos de Revly.
// Centralizadas aquí para que, en el futuro, cada negocio
// pueda configurarlas (porcentaje, cantidad fija, producto
// gratis, recompensa personalizada) sin tocar la lógica.

export const POINTS_CAP = 10; // máximo de puntos acumulables sin canjear
export const POINTS_PER_REDEMPTION = 5; // puntos necesarios para canjear
export const DISCOUNT_PERCENT = 10; // descuento actual al canjear

// "YYYY-MM-DD" en UTC. Se usa para imponer el límite de
// 1 punto al día (idéntico al "startOfDay" que ya usaba
// el sistema de tickets).
export function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}
