import { BusinessSubscriptionPlan, type PrismaClient } from '@prisma/client';
import { BadRequestError } from '../common/exceptions';

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

/** What decides whether an admin holds a seat in a business's panel. */
export type SeatState = {
  adminType: string;
  sellerId: string | null;
  isActive: boolean;
};

/**
 * Refuses a change that would seat one more admin in a business's panel than
 * its plan gives (USR-15): none on the free plan, never more than the plan's
 * count. Only an admin that newly takes a seat is checked: created,
 * reactivated, or moved into a business. `id` leaves that admin out of the
 * count. Used by EKORU's Administradores screen and the business's own Team
 * screen alike.
 */
export async function assertPanelSeat(
  prisma: Db & Pick<PrismaClient, 'admin'>,
  {
    before,
    after,
    id,
    messages,
  }: {
    before?: SeatState | null;
    after: SeatState;
    id?: string;
    messages: { panelNotInPlan: string; panelSeatsFull: string };
  },
): Promise<void> {
  const seated = (a?: SeatState | null) =>
    !!a?.isActive && a.adminType === 'BUSINESS' && !!a.sellerId;
  if (!seated(after)) return;
  if (seated(before) && before!.sellerId === after.sellerId) return;

  const sellerId = after.sellerId!;
  const { seats } = await businessPanelSeats(prisma, sellerId);
  if (seats <= 0) throw new BadRequestError(messages.panelNotInPlan);
  const used = await prisma.admin.count({
    where: {
      sellerId,
      adminType: 'BUSINESS',
      isActive: true,
      ...(id && { id: { not: id } }),
    },
  });
  if (used >= seats) {
    throw new BadRequestError(
      messages.panelSeatsFull.replace('{{seats}}', String(seats)),
    );
  }
}
