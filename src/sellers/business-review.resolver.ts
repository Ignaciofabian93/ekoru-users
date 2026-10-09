import { Resolver, ResolveField, Parent, Context } from '@nestjs/graphql';
import { BusinessProfile } from './entities/business-profile.entity';
import { CurrentAdmin, CurrentSeller } from '../common/decorators';
import { DateTimeScalar } from '../graphql/scalars';
import { PrismaService } from '../prisma/prisma.service';
import { AdminPermission, AdminType } from '../graphql/enums';
import {
  AdminAccessRow,
  adminRowCan,
  loadAdminAccess,
} from '../common/admin-access';

/** Per-request cache, so a list of businesses reads the admin row once. */
type ReviewContext = {
  reviewAdminAccess?: Promise<AdminAccessRow | null>;
};

type ReviewedProfile = {
  sellerId: string;
  applicationMessage?: string | null;
  rejectionReason?: string | null;
  reviewedAt?: Date | null;
};

/**
 * Onboarding-review fields on BusinessProfile. BusinessProfile is public (store
 * pages read it), but what a business wrote to EKORU and why it was rejected
 * are private: they resolve only for the business itself, its own business
 * admin account, or a platform admin with MANAGE_USERS, and are null for
 * everyone else.
 */
@Resolver(() => BusinessProfile)
export class BusinessReviewResolver {
  constructor(private readonly prisma: PrismaService) {}

  @ResolveField(() => String, {
    nullable: true,
    description:
      'What the business told EKORU at sign-up. Admins and the owner only.',
  })
  async applicationMessage(
    @Parent() profile: ReviewedProfile,
    @Context() ctx: ReviewContext,
    @CurrentAdmin() adminId?: string,
    @CurrentSeller() sellerId?: string,
  ) {
    return (await this.canSee(profile, ctx, adminId, sellerId))
      ? (profile.applicationMessage ?? null)
      : null;
  }

  @ResolveField(() => String, {
    nullable: true,
    description: 'Why the application was rejected. Admins and the owner only.',
  })
  async rejectionReason(
    @Parent() profile: ReviewedProfile,
    @Context() ctx: ReviewContext,
    @CurrentAdmin() adminId?: string,
    @CurrentSeller() sellerId?: string,
  ) {
    return (await this.canSee(profile, ctx, adminId, sellerId))
      ? (profile.rejectionReason ?? null)
      : null;
  }

  @ResolveField(() => DateTimeScalar, {
    nullable: true,
    description:
      'When EKORU reviewed the application. Admins and the owner only.',
  })
  async reviewedAt(
    @Parent() profile: ReviewedProfile,
    @Context() ctx: ReviewContext,
    @CurrentAdmin() adminId?: string,
    @CurrentSeller() sellerId?: string,
  ) {
    return (await this.canSee(profile, ctx, adminId, sellerId))
      ? (profile.reviewedAt ?? null)
      : null;
  }

  private async canSee(
    profile: ReviewedProfile,
    ctx: ReviewContext,
    adminId?: string,
    sellerId?: string,
  ): Promise<boolean> {
    if (sellerId && sellerId === profile.sellerId) return true;
    if (!adminId) return false;
    // Any admin token used to be enough, so a business admin could read every
    // other business's application (USR-8).
    ctx.reviewAdminAccess ??= loadAdminAccess(this.prisma, adminId);
    const admin = await ctx.reviewAdminAccess;
    if (adminRowCan(admin, AdminPermission.MANAGE_USERS)) return true;
    return (
      !!admin &&
      admin.isActive &&
      (admin.adminType as AdminType) === AdminType.BUSINESS &&
      admin.sellerId === profile.sellerId
    );
  }
}
