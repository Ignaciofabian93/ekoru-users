import { BusinessSubscriptionPlan, type PrismaClient } from '@prisma/client';

type Db = Pick<
  PrismaClient,
  'businessMembershipSubscription' | 'businessPlanRule'
>;

/**
 * The panel seats a business gets from its plan in force (USR-15): that plan's
 * BusinessPlanRule, or the free plan's when no paid term runs. 0 means no
 * panel. The gateway applies the same rule at login and on every refresh
 * (`src/auth/business-panel-access.ts` there).
 */
export async function businessPanelSeats(
  prisma: Db,
  sellerId: string,
  now: Date = new Date(),
): Promise<{ plan: BusinessSubscriptionPlan; seats: number }> {
  const term = await prisma.businessMembershipSubscription.findFirst({
    where: {
      sellerId,
      isActive: true,
      startDate: { lte: now },
      OR: [{ endDate: null }, { endDate: { gt: now } }],
    },
    orderBy: { startDate: 'desc' },
    select: { businessMembership: { select: { membershipType: true } } },
  });
  const plan =
    term?.businessMembership.membershipType ??
    BusinessSubscriptionPlan.FREEMIUM;
  const rule = await prisma.businessPlanRule.findUnique({
    where: { plan },
    select: { panelSeats: true },
  });
  return { plan, seats: rule?.panelSeats ?? 0 };
}
