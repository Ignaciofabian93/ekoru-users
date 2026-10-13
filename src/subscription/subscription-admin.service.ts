import { Injectable, Logger } from '@nestjs/common';
import {
  BusinessSubscriptionPlan as PrismaBusinessPlan,
  PersonSubscriptionPlan as PrismaPersonPlan,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  BadRequestError,
  InternalServerError,
  NotFoundError,
  UnAuthorizedError,
} from '../common/exceptions';
import {
  AdminPermission,
  BusinessSubscriptionPlan,
  Language,
  PersonSubscriptionPlan,
} from '../graphql/enums';
import { assertAdminCan } from '../common/admin-access';
import { subscriptionMessages } from './subscription.i18n';
import {
  calculatePrismaParams,
  createPaginatedResponse,
} from '../utils/pagination';
import {
  AdminMembershipSubscription,
  MembershipKind,
} from './entities/admin-membership-subscription.entity';

interface PaymentRow {
  id: number;
  amount: number;
  status: string;
  provider: string;
}

/** The columns both subscription tables share, plus what the list shows. */
interface TermRow {
  id: number;
  sellerId: string;
  startDate: Date;
  endDate: Date | null;
  isActive: boolean;
  autoRenew: boolean;
  paymentId: number | null;
  createdAt: Date;
  membershipId: number;
  plan: string;
  planName: string | null;
  sellerEmail: string | null;
  sellerName: string | null;
}

/**
 * Membership subscriptions for the admin panel (ADM-12): list person or
 * business terms with their plan, dates and payment, and cancel one.
 * Reading takes MANAGE_USERS or VIEW_TRANSACTIONS (support and finance both
 * look terms up); cancelling takes MANAGE_USERS.
 */
@Injectable()
export class SubscriptionAdminService {
  private readonly logger = new Logger(SubscriptionAdminService.name);

  constructor(private readonly prisma: PrismaService) {}

  async list({
    adminId,
    language,
    kind,
    active,
    plan,
    endsBefore,
    search,
    page = 1,
    pageSize = 20,
  }: {
    adminId?: string;
    language: Language;
    kind: MembershipKind;
    active?: boolean;
    plan?: string;
    endsBefore?: Date;
    search?: string;
    page?: number;
    pageSize?: number;
  }) {
    const t = subscriptionMessages[language];
    await assertAdminCan(this.prisma, {
      adminId,
      permission: [
        AdminPermission.MANAGE_USERS,
        AdminPermission.VIEW_TRANSACTIONS,
      ],
      messages: { unauthorized: t.unauthorized, forbidden: t.forbidden },
    });
    this.assertPlan(kind, plan, t.membershipNotFound);

    try {
      const { skip, take } = calculatePrismaParams(page, pageSize);
      const term = search?.trim();
      const shared = {
        ...(active !== undefined && { isActive: active }),
        ...(endsBefore && { endDate: { lte: endsBefore } }),
      };
      const contains = (value: string) => ({
        contains: value,
        mode: Prisma.QueryMode.insensitive,
      });

      let count: number;
      let rows: TermRow[];
      if (kind === MembershipKind.PERSON) {
        const where: Prisma.PersonMembershipSubscriptionWhereInput = {
          ...shared,
          ...(plan && {
            personMembership: { membershipType: plan as PrismaPersonPlan },
          }),
          ...(term && {
            seller: {
              OR: [
                { email: contains(term) },
                { personProfile: { firstName: contains(term) } },
                { personProfile: { lastName: contains(term) } },
                { personProfile: { displayName: contains(term) } },
              ],
            },
          }),
        };
        const [total, found] = await Promise.all([
          this.prisma.personMembershipSubscription.count({ where }),
          this.prisma.personMembershipSubscription.findMany({
            where,
            skip,
            take,
            orderBy: { createdAt: 'desc' },
            include: {
              personMembership: {
                select: {
                  membershipType: true,
                  translations: { where: { language }, select: { name: true } },
                },
              },
              seller: {
                select: {
                  email: true,
                  personProfile: {
                    select: {
                      displayName: true,
                      firstName: true,
                      lastName: true,
                    },
                  },
                },
              },
            },
          }),
        ]);
        count = total;
        rows = found.map(({ personMembership, seller, ...row }) => {
          const profile = seller?.personProfile;
          return {
            ...row,
            membershipId: row.personMembershipId,
            plan: personMembership.membershipType,
            planName: personMembership.translations[0]?.name ?? null,
            sellerEmail: seller?.email ?? null,
            sellerName:
              profile?.displayName ||
              [profile?.firstName, profile?.lastName]
                .filter(Boolean)
                .join(' ') ||
              null,
          };
        });
      } else {
        const where: Prisma.BusinessMembershipSubscriptionWhereInput = {
          ...shared,
          ...(plan && {
            businessMembership: { membershipType: plan as PrismaBusinessPlan },
          }),
          ...(term && {
            seller: {
              OR: [
                { email: contains(term) },
                { businessProfile: { businessName: contains(term) } },
              ],
            },
          }),
        };
        const [total, found] = await Promise.all([
          this.prisma.businessMembershipSubscription.count({ where }),
          this.prisma.businessMembershipSubscription.findMany({
            where,
            skip,
            take,
            orderBy: { createdAt: 'desc' },
            include: {
              businessMembership: {
                select: {
                  membershipType: true,
                  translations: { where: { language }, select: { name: true } },
                },
              },
              seller: {
                select: {
                  email: true,
                  businessProfile: { select: { businessName: true } },
                },
              },
            },
          }),
        ]);
        count = total;
        rows = found.map(({ businessMembership, seller, ...row }) => ({
          ...row,
          membershipId: row.businessMembershipId,
          plan: businessMembership.membershipType,
          planName: businessMembership.translations[0]?.name ?? null,
          sellerEmail: seller?.email ?? null,
          sellerName: seller?.businessProfile?.businessName ?? null,
        }));
      }

      const payments = await this.paymentsById(rows);
      const nodes: AdminMembershipSubscription[] = rows.map((row) => {
        const payment = row.paymentId ? payments.get(row.paymentId) : undefined;
        return {
          id: row.id,
          kind,
          sellerId: row.sellerId,
          sellerEmail: row.sellerEmail,
          sellerName: row.sellerName,
          membershipId: row.membershipId,
          plan: row.plan,
          planName: row.planName,
          startDate: row.startDate,
          endDate: row.endDate,
          isActive: row.isActive,
          autoRenew: row.autoRenew,
          paymentId: row.paymentId,
          paymentAmount: payment?.amount ?? null,
          paymentStatus: payment?.status ?? null,
          paymentProvider: payment?.provider ?? null,
          createdAt: row.createdAt,
        };
      });
      return createPaginatedResponse(nodes, count, page, pageSize);
    } catch (error) {
      this.logger.error(t.errorGetMemberships, error);
      throw new InternalServerError(t.errorGetMemberships);
    }
  }

  /**
   * Ends a term now, as the expiry sweep does when its end date passes: the
   * term goes inactive and the profile that pointed at it returns to the free
   * plan. No refund is made here; refund the payment in Transactions.
   * Returns the subscription id.
   */
  async cancel({
    adminId,
    language,
    kind,
    id,
  }: {
    adminId?: string;
    language: Language;
    kind: MembershipKind;
    id: number;
  }): Promise<number> {
    const t = subscriptionMessages[language];
    await assertAdminCan(this.prisma, {
      adminId,
      permission: AdminPermission.MANAGE_USERS,
      messages: { unauthorized: t.unauthorized, forbidden: t.forbidden },
    });

    try {
      const now = new Date();
      if (kind === MembershipKind.PERSON) {
        const term = await this.prisma.personMembershipSubscription.findUnique({
          where: { id },
          select: { id: true, isActive: true },
        });
        if (!term) throw new NotFoundError(t.subscriptionNotFound);
        if (!term.isActive) return id;
        await this.prisma.$transaction([
          this.prisma.personMembershipSubscription.update({
            where: { id },
            data: { isActive: false, endDate: now, autoRenew: false },
          }),
          this.prisma.personProfile.updateMany({
            where: { personMembershipSubscriptionId: id },
            data: { personMembershipSubscriptionId: null },
          }),
        ]);
      } else {
        const term =
          await this.prisma.businessMembershipSubscription.findUnique({
            where: { id },
            select: { id: true, isActive: true },
          });
        if (!term) throw new NotFoundError(t.subscriptionNotFound);
        if (!term.isActive) return id;
        await this.prisma.$transaction([
          this.prisma.businessMembershipSubscription.update({
            where: { id },
            data: { isActive: false, endDate: now, autoRenew: false },
          }),
          this.prisma.businessProfile.updateMany({
            where: { businessMembershipSubscriptionId: id },
            data: { businessMembershipSubscriptionId: null },
          }),
        ]);
      }
      return id;
    } catch (error) {
      if (
        error instanceof NotFoundError ||
        error instanceof UnAuthorizedError
      ) {
        throw error;
      }
      this.logger.error(t.errorCancelSubscription, error);
      throw new InternalServerError(t.errorCancelSubscription);
    }
  }

  private assertPlan(
    kind: MembershipKind,
    plan: string | undefined,
    message: string,
  ) {
    if (!plan) return;
    const plans: string[] =
      kind === MembershipKind.PERSON
        ? Object.values(PersonSubscriptionPlan)
        : Object.values(BusinessSubscriptionPlan);
    if (!plans.includes(plan)) throw new BadRequestError(message);
  }

  /** The platform payments behind these terms (the table belongs to transactions). */
  private async paymentsById(
    rows: TermRow[],
  ): Promise<Map<number, PaymentRow>> {
    const ids = [
      ...new Set(
        rows.map((row) => row.paymentId).filter((id): id is number => !!id),
      ),
    ];
    if (!ids.length) return new Map();
    const payments = await this.prisma.$queryRaw<PaymentRow[]>`
      SELECT id, amount, status::text AS status, "paymentProvider"::text AS provider
      FROM "Payment"
      WHERE id = ANY(${ids}::int[])
    `;
    return new Map(payments.map((payment) => [payment.id, payment]));
  }
}
