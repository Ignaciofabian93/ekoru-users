import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  BadRequestError,
  ForbiddenError,
  InternalServerError,
  NotFoundError,
  UnAuthorizedError,
} from '../common/exceptions';
import { AdminPermission, AdminRole, Language } from '../graphql/enums';
import {
  assertPanelSeat,
  businessPanelSeats,
} from '../subscription/panel-seats';
import { adminMessages } from './admins.i18n';
import { teamMessages, type TeamMessages } from './business-team.i18n';
import {
  AdminPasswordService,
  unusablePassword,
} from './admin-password.service';
import type { InviteBusinessAdminInput, UpdateBusinessAdminInput } from './dto';

/** Every permission a business account can hold. The owner holds them all. */
export const BUSINESS_PERMISSIONS: readonly AdminPermission[] = [
  AdminPermission.MANAGE_BUSINESS_PROFILE,
  AdminPermission.MANAGE_BUSINESS_TEAM,
  AdminPermission.VIEW_BUSINESS_ANALYTICS,
  AdminPermission.MANAGE_BUSINESS_PRODUCTS,
  AdminPermission.MANAGE_BUSINESS_ORDERS,
];

/** The roles an owner can give. There is one owner per business. */
const TEAM_ROLES: readonly AdminRole[] = [
  AdminRole.BUSINESS_MANAGER,
  AdminRole.BUSINESS_ANALYST,
  AdminRole.BUSINESS_SUPPORT,
];

const MEMBER_SELECT = {
  id: true,
  email: true,
  name: true,
  lastName: true,
  role: true,
  permissions: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
} as const;

type Caller = {
  id: string;
  sellerId: string;
  role: string;
  permissions: string[];
};

/**
 * A business's own panel accounts (USR-15). The owner, or a member with
 * MANAGE_BUSINESS_TEAM, adds members up to the plan's accounts, changes their
 * role and permissions, and turns them off and on. The owner's own account is
 * not editable here, and nobody edits themselves. New accounts choose their
 * password from an emailed link. EKORU's Administradores screen keeps full
 * control over every account.
 */
@Injectable()
export class BusinessTeamService {
  private readonly logger = new Logger(BusinessTeamService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: AdminPasswordService,
  ) {}

  /** Whether a business account holds a permission: the owner holds them all. */
  static holds(
    admin: { role: string; permissions: string[] },
    permission: AdminPermission,
  ): boolean {
    return (
      (admin.role === 'BUSINESS_OWNER' &&
        BUSINESS_PERMISSIONS.includes(permission)) ||
      admin.permissions.includes(permission)
    );
  }

  private async loadCaller(
    adminId: string | undefined,
    t: TeamMessages,
  ): Promise<Caller> {
    if (!adminId) throw new UnAuthorizedError(t.unauthorized);
    const admin = await this.prisma.admin.findUnique({
      where: { id: adminId },
      select: {
        id: true,
        adminType: true,
        role: true,
        permissions: true,
        isActive: true,
        sellerId: true,
      },
    });
    if (!admin?.isActive || admin.adminType !== 'BUSINESS' || !admin.sellerId) {
      throw new ForbiddenError(t.notBusinessAdmin);
    }
    if (
      !BusinessTeamService.holds(admin, AdminPermission.MANAGE_BUSINESS_TEAM)
    ) {
      throw new ForbiddenError(t.forbiddenTeam);
    }
    return { ...admin, sellerId: admin.sellerId };
  }

  /** A member the caller may change: same business, not the owner, not themselves. */
  private async loadMember(caller: Caller, id: string, t: TeamMessages) {
    const member = await this.prisma.admin.findFirst({
      where: { id, sellerId: caller.sellerId, adminType: 'BUSINESS' },
      select: { ...MEMBER_SELECT, adminType: true, sellerId: true },
    });
    if (!member) throw new NotFoundError(t.memberNotFound);
    if (member.id === caller.id) throw new BadRequestError(t.cannotChangeSelf);
    if (member.role === 'BUSINESS_OWNER') {
      throw new BadRequestError(t.cannotChangeOwner);
    }
    return member;
  }

  /** A team role, and only business permissions the caller holds. */
  private assertGrant(
    caller: Caller,
    { role, permissions }: { role?: string; permissions?: string[] },
    t: TeamMessages,
  ) {
    if (role !== undefined && !TEAM_ROLES.includes(role as AdminRole)) {
      throw new BadRequestError(t.invalidRole);
    }
    const allowed = (p: string) =>
      BUSINESS_PERMISSIONS.includes(p as AdminPermission) &&
      BusinessTeamService.holds(caller, p as AdminPermission);
    if (permissions && !permissions.every(allowed)) {
      throw new BadRequestError(t.invalidPermissions);
    }
  }

  private rethrow(error: unknown, t: TeamMessages, what: string): never {
    if (
      error instanceof UnAuthorizedError ||
      error instanceof BadRequestError ||
      error instanceof NotFoundError
    ) {
      throw error;
    }
    this.logger.error(`Error ${what}:`, error);
    throw new InternalServerError(t.errorTeam);
  }

  async getMyTeam({
    adminId,
    language,
  }: {
    adminId?: string;
    language: Language;
  }) {
    const t = teamMessages[language];
    try {
      const caller = await this.loadCaller(adminId, t);
      const [{ plan, seats }, rows] = await Promise.all([
        businessPanelSeats(this.prisma, caller.sellerId),
        this.prisma.admin.findMany({
          where: { sellerId: caller.sellerId, adminType: 'BUSINESS' },
          orderBy: { createdAt: 'asc' },
          select: MEMBER_SELECT,
        }),
      ]);
      // The gateway's seating order: the owner first, then the oldest.
      const members = [
        ...rows.filter((m) => m.role === 'BUSINESS_OWNER'),
        ...rows.filter((m) => m.role !== 'BUSINESS_OWNER'),
      ];
      let seated = 0;
      return {
        plan,
        seats,
        used: members.filter((m) => m.isActive).length,
        members: members.map((m) => ({
          ...m,
          hasSeat: m.isActive && seated++ < seats,
        })),
      };
    } catch (error) {
      this.rethrow(error, t, 'loading a business team');
    }
  }

  async inviteMember({
    adminId,
    language,
    input,
  }: {
    adminId?: string;
    language: Language;
    input: InviteBusinessAdminInput;
  }) {
    const t = teamMessages[language];
    try {
      const caller = await this.loadCaller(adminId, t);
      this.assertGrant(caller, input, t);

      const email = input.email.trim().toLowerCase();
      const taken = await this.prisma.admin.findUnique({
        where: { email },
        select: { id: true },
      });
      if (taken) {
        throw new BadRequestError(adminMessages[language].emailAlreadyExists);
      }
      await assertPanelSeat(this.prisma, {
        after: {
          adminType: 'BUSINESS',
          sellerId: caller.sellerId,
          isActive: true,
        },
        messages: adminMessages[language],
      });

      const member = await this.prisma.admin.create({
        data: {
          email,
          password: await unusablePassword(),
          name: input.name.trim(),
          lastName: input.lastName?.trim() || null,
          adminType: 'BUSINESS',
          role: input.role,
          permissions: input.permissions,
          sellerId: caller.sellerId,
        },
        select: MEMBER_SELECT,
      });
      await this.passwords.sendLink({ adminId: member.id, kind: 'invite' });
      return { ...member, hasSeat: true };
    } catch (error) {
      this.rethrow(error, t, 'inviting a team member');
    }
  }

  async updateMember({
    adminId,
    language,
    id,
    input,
  }: {
    adminId?: string;
    language: Language;
    id: string;
    input: UpdateBusinessAdminInput;
  }) {
    const t = teamMessages[language];
    try {
      const caller = await this.loadCaller(adminId, t);
      await this.loadMember(caller, id, t);
      this.assertGrant(caller, input, t);

      const member = await this.prisma.admin.update({
        where: { id },
        data: {
          ...(input.name !== undefined && { name: input.name.trim() }),
          ...(input.lastName !== undefined && {
            lastName: input.lastName.trim() || null,
          }),
          ...(input.role !== undefined && { role: input.role }),
          ...(input.permissions !== undefined && {
            permissions: input.permissions,
          }),
        },
        select: MEMBER_SELECT,
      });
      return { ...member, hasSeat: member.isActive };
    } catch (error) {
      this.rethrow(error, t, 'updating a team member');
    }
  }

  /** Turning a member back on takes a free account, like adding one. */
  async setMemberActive({
    adminId,
    language,
    id,
    isActive,
  }: {
    adminId?: string;
    language: Language;
    id: string;
    isActive: boolean;
  }) {
    const t = teamMessages[language];
    try {
      const caller = await this.loadCaller(adminId, t);
      const before = await this.loadMember(caller, id, t);
      await assertPanelSeat(this.prisma, {
        before,
        after: { ...before, isActive },
        id,
        messages: adminMessages[language],
      });
      const member = await this.prisma.admin.update({
        where: { id },
        data: { isActive },
        select: MEMBER_SELECT,
      });
      return { ...member, hasSeat: member.isActive };
    } catch (error) {
      this.rethrow(error, t, 'turning a team member on or off');
    }
  }

  /** A fresh invite link, e.g. when the first one expired. */
  async resendInvite({
    adminId,
    language,
    id,
  }: {
    adminId?: string;
    language: Language;
    id: string;
  }): Promise<boolean> {
    const t = teamMessages[language];
    try {
      const caller = await this.loadCaller(adminId, t);
      await this.loadMember(caller, id, t);
      return await this.passwords.sendLink({ adminId: id, kind: 'invite' });
    } catch (error) {
      this.rethrow(error, t, 'resending an invite');
    }
  }

  /**
   * Opens the panel for a business that just bought a paid plan: creates the
   * owner's account with the business's email and emails the link to choose a
   * password. Does nothing when the plan has no panel, when the business
   * already has panel accounts (EKORU or the owner manage them), or when the
   * email already belongs to another panel account. Returns the new id.
   */
  async ensureOwner(sellerId: string): Promise<string | null> {
    const { seats } = await businessPanelSeats(this.prisma, sellerId);
    if (seats <= 0) return null;

    const existing = await this.prisma.admin.findFirst({
      where: { sellerId, adminType: 'BUSINESS' },
      select: { id: true },
    });
    if (existing) return null;

    const seller = await this.prisma.seller.findUnique({
      where: { id: sellerId },
      select: {
        email: true,
        businessProfile: { select: { businessName: true } },
      },
    });
    if (!seller?.businessProfile) return null;

    const email = seller.email.trim().toLowerCase();
    const clash = await this.prisma.admin.findUnique({
      where: { email },
      select: { id: true },
    });
    if (clash) {
      this.logger.warn(
        `No panel owner created for seller ${sellerId}: ${email} already has a panel account`,
      );
      return null;
    }

    const owner = await this.prisma.admin.create({
      data: {
        email,
        password: await unusablePassword(),
        name: seller.businessProfile.businessName,
        adminType: 'BUSINESS',
        role: AdminRole.BUSINESS_OWNER,
        permissions: [...BUSINESS_PERMISSIONS],
        sellerId,
      },
      select: { id: true },
    });
    await this.passwords.sendLink({ adminId: owner.id, kind: 'invite' });
    this.logger.log(`Panel owner ${owner.id} created for seller ${sellerId}`);
    return owner.id;
  }
}
