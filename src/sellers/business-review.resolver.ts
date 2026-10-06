import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { BusinessProfile } from './entities/business-profile.entity';
import { CurrentAdmin, CurrentSeller } from '../common/decorators';
import { DateTimeScalar } from '../graphql/scalars';

type ReviewedProfile = {
  sellerId: string;
  applicationMessage?: string | null;
  rejectionReason?: string | null;
  reviewedAt?: Date | null;
};

/**
 * Onboarding-review fields on BusinessProfile. BusinessProfile is public (store
 * pages read it), but what a business wrote to EKORU and why it was rejected
 * are private: they resolve only for an admin or for the business itself, and
 * are null for everyone else.
 */
@Resolver(() => BusinessProfile)
export class BusinessReviewResolver {
  @ResolveField(() => String, {
    nullable: true,
    description:
      'What the business told EKORU at sign-up. Admins and the owner only.',
  })
  applicationMessage(
    @Parent() profile: ReviewedProfile,
    @CurrentAdmin() adminId?: string,
    @CurrentSeller() sellerId?: string,
  ) {
    return this.canSee(profile, adminId, sellerId)
      ? (profile.applicationMessage ?? null)
      : null;
  }

  @ResolveField(() => String, {
    nullable: true,
    description: 'Why the application was rejected. Admins and the owner only.',
  })
  rejectionReason(
    @Parent() profile: ReviewedProfile,
    @CurrentAdmin() adminId?: string,
    @CurrentSeller() sellerId?: string,
  ) {
    return this.canSee(profile, adminId, sellerId)
      ? (profile.rejectionReason ?? null)
      : null;
  }

  @ResolveField(() => DateTimeScalar, {
    nullable: true,
    description:
      'When EKORU reviewed the application. Admins and the owner only.',
  })
  reviewedAt(
    @Parent() profile: ReviewedProfile,
    @CurrentAdmin() adminId?: string,
    @CurrentSeller() sellerId?: string,
  ) {
    return this.canSee(profile, adminId, sellerId)
      ? (profile.reviewedAt ?? null)
      : null;
  }

  private canSee(
    profile: ReviewedProfile,
    adminId?: string,
    sellerId?: string,
  ): boolean {
    return !!adminId || (!!sellerId && sellerId === profile.sellerId);
  }
}
