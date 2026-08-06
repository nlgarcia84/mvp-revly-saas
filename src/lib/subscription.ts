import prisma from './db';

// ─── Definición de los 3 planes ────────────────────
// Cada plan define:
//   maxBusinesses — límite de negocios que puede crear
//   features — array de strings identificando funciones
//              disponibles (se usan para gates en UI)
// ──────────────────────────────────────────────────
const PLANS = {
  basico: {
    maxBusinesses: 1,
    label: 'Básico',
    price: 0,
    stripePriceId: null,
    features: [
      'qr-points',
      'invoice-claims',
      'cashier-qr-pin',
      'google-places-reviews',
      'manual-customers',
      'email-invitations',
      'basic-analytics',
    ],
  },
  avanzado: {
    maxBusinesses: 5,
    label: 'Avanzado',
    price: 9,
    stripePriceId: 'price_1U1WfmR8J40peD82mTLBUosR',
    features: [
      'qr-points',
      'invoice-claims',
      'cashier-qr-pin',
      'google-places-reviews',
      'manual-customers',
      'email-invitations',
      'basic-analytics',
      'google-business-profile',
      'csv-import',
      'ai-responses',
      'advanced-filters',
    ],
  },
  pro: {
    maxBusinesses: 999,
    label: 'Pro',
    price: 19,
    stripePriceId: 'price_1U1WhkR8J40peD825bfelw3g',
    features: [
      'qr-points',
      'invoice-claims',
      'cashier-qr-pin',
      'google-places-reviews',
      'manual-customers',
      'email-invitations',
      'basic-analytics',
      'google-business-profile',
      'csv-import',
      'ai-responses',
      'advanced-filters',
      'pdf-reports',
      'custom-qr-email',
      'full-analytics',
      'star-ratings',
    ],
  },
} as const;

export type PlanKey = keyof typeof PLANS;

/**
 * hasFeature
 *
 * Comprueba si el plan del usuario tiene una función específica.
 * Se usa en componentes cliente/servidor para mostrar/ocultar
 * funcionalidades según el plan contratado.
 *
 * Ej: hasFeature(plan, 'ai-responses') → true/false
 */
export const hasFeature = (plan: PlanKey, feature: string): boolean => {
  return (PLANS[plan]?.features as readonly string[]).includes(feature);
};

/**
 * getPlanFeatures
 *
 * Devuelve el array de features para un plan dado.
 */
export const getPlanFeatures = (plan: PlanKey): readonly string[] => {
  return PLANS[plan]?.features ?? [];
};

/**
 * getPlan
 *
 * Obtiene el plan efectivo del usuario (considerando trial).
 * Si el usuario no tiene suscripción, se le asigna 'basico'.
 * Si está en periodo de prueba (trialEndsAt futuro), obtiene
 * todas las features de 'pro' aunque su plan sea 'basico'.
 *
 * Devuelve:
 *   plan — plan efectivo (basico | avanzado | pro)
 *   originalPlan — lo que pone en BD
 *   maxBusinesses — límite de negocios
 *   features — array de funciones disponibles
 *   trialDaysLeft — días restantes de prueba (0 si no hay)
 *   status — estado de la suscripción
 */
export const getPlan = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { subscription: true },
  });

  if (!user || !user.subscription) {
    return {
      plan: 'basico' as PlanKey,
      status: 'active' as const,
      maxBusinesses: PLANS.basico.maxBusinesses,
      features: PLANS.basico.features,
      trialDaysLeft: 0,
      trialEndsAt: null,
    };
  }

  const sub = user.subscription;
  const plan = sub.plan as PlanKey;

  const trialDaysLeft = sub.trialEndsAt && sub.trialEndsAt > new Date()
    ? Math.ceil((sub.trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;

  const isOnTrial = trialDaysLeft > 0 && plan === 'basico';

  // Si está en trial, obtiene todas las features de pro
  const effectivePlan: PlanKey = isOnTrial ? 'pro' : plan;
  const effectiveFeatures = isOnTrial ? PLANS.pro.features : PLANS[effectivePlan]?.features ?? PLANS.basico.features;

  return {
    plan: effectivePlan,
    originalPlan: plan,
    status: sub.status,
    maxBusinesses: PLANS[effectivePlan]?.maxBusinesses ?? PLANS.basico.maxBusinesses,
    features: effectiveFeatures,
    trialDaysLeft,
    trialEndsAt: sub.trialEndsAt,
  };
};

/**
 * canCreateBusiness
 *
 * Verifica si el usuario puede crear un nuevo negocio según
 * el límite de su plan. Devuelve si está permitido, cuántos
 * tiene actualmente y el límite.
 */
export const canCreateBusiness = async (userId: string) => {
  const planData = await getPlan(userId);
  const count = await prisma.business.count({ where: { userId } });
  return {
    allowed: count < planData.maxBusinesses,
    count,
    limit: planData.maxBusinesses,
    plan: planData.plan,
    features: planData.features,
  };
};
