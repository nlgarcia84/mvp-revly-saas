import prisma from './db';

const PLAN_LIMITS = {
  free: { maxBusinesses: 1 },
  pro: { maxBusinesses: 999 },
} as const;

export type PlanKey = keyof typeof PLAN_LIMITS;

export const getPlan = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { subscription: true },
  });

  if (!user || !user.subscription) {
    return { plan: 'free' as const, status: 'active' as const, maxBusinesses: 1, trialDaysLeft: 0 };
  }

  const sub = user.subscription;
  const plan = sub.plan as PlanKey;

  const trialDaysLeft = sub.trialEndsAt && sub.trialEndsAt > new Date()
    ? Math.ceil((sub.trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;

  const isOnTrial = trialDaysLeft > 0 && plan === 'free';

  const effectivePlan: PlanKey = isOnTrial ? 'pro' : plan;

  return {
    plan: effectivePlan,
    originalPlan: plan as string,
    status: sub.status,
    maxBusinesses: PLAN_LIMITS[effectivePlan]?.maxBusinesses ?? 1,
    trialDaysLeft,
    trialEndsAt: sub.trialEndsAt,
  };
};

export const canCreateBusiness = async (userId: string) => {
  const plan = await getPlan(userId);
  const count = await prisma.business.count({ where: { userId } });
  return { allowed: count < plan.maxBusinesses, count, limit: plan.maxBusinesses, plan: plan.plan };
};
