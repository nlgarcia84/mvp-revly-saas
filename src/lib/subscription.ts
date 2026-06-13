import prisma from './db';

const PLAN_LIMITS = {
  free: { maxBusinesses: 1 },
  pro: { maxBusinesses: 999 },
} as const;

export const getPlan = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { subscription: true },
  });

  if (!user || !user.subscription) {
    return { plan: 'free' as const, status: 'active' as const, maxBusinesses: 1 };
  }

  const plan = user.subscription.plan as keyof typeof PLAN_LIMITS;
  return {
    plan,
    status: user.subscription.status,
    maxBusinesses: PLAN_LIMITS[plan]?.maxBusinesses ?? 1,
  };
};

export const canCreateBusiness = async (userId: string) => {
  const plan = await getPlan(userId);
  const count = await prisma.business.count({ where: { userId } });
  return { allowed: count < plan.maxBusinesses, count, limit: plan.maxBusinesses, plan: plan.plan };
};
