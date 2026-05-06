import {
  Resolver,
  Query,
  Mutation,
  Args,
  Int,
  ResolveField,
  Parent,
  Context,
} from '@nestjs/graphql';
import { SubscriptionService } from './subscription.service';
import { PersonMembershipLoader } from './loaders/person-membership.loader';
import { BusinessMembershipLoader } from './loaders/business-membership.loader';
import {
  PersonMembership,
  PersonMembershipTranslation,
  PersonMembershipPricing,
  PersonMembershipSubscription,
  BusinessMembership,
  BusinessMembershipTranslation,
  BusinessMembershipPricing,
  BusinessMembershipSubscription,
} from './entities';
import {
  CreatePersonMembershipInput,
  CreateBusinessMembershipInput,
  CreatePersonMembershipSubscriptionInput,
  CreateBusinessMembershipSubscriptionInput,
  UpsertPersonMembershipTranslationInput,
  UpsertBusinessMembershipTranslationInput,
  UpsertPersonMembershipPricingInput,
  UpsertBusinessMembershipPricingInput,
} from './dto';
import { PersonProfile } from '../sellers/entities/person-profile.entity';
import { BusinessProfile } from '../sellers/entities/business-profile.entity';
import { CurrentSeller } from '../common/decorators';
import { Language } from '../graphql/enums';

// ─── Membership Queries & Mutations ──────────────────────────────────────────

@Resolver(() => PersonMembership)
export class SubscriptionResolver {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Query(() => [PersonMembership], { name: 'personMemberships' })
  getPersonMemberships(
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
    @Args('countryId', { type: () => Int, nullable: true }) countryId?: number,
  ) {
    return this.subscriptionService.getPersonMemberships(language, countryId);
  }

  @Query(() => PersonMembership, { name: 'personMembership', nullable: true })
  getPersonMembership(
    @Args('id', { type: () => Int }) id: number,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
    @Args('countryId', { type: () => Int, nullable: true }) countryId?: number,
  ) {
    return this.subscriptionService.getPersonMembershipById(
      id,
      language,
      countryId,
    );
  }

  @Query(() => [BusinessMembership], { name: 'businessMemberships' })
  getBusinessMemberships(
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
    @Args('countryId', { type: () => Int, nullable: true }) countryId?: number,
  ) {
    return this.subscriptionService.getBusinessMemberships(language, countryId);
  }

  @Query(() => BusinessMembership, {
    name: 'businessMembership',
    nullable: true,
  })
  getBusinessMembership(
    @Args('id', { type: () => Int }) id: number,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
    @Args('countryId', { type: () => Int, nullable: true }) countryId?: number,
  ) {
    return this.subscriptionService.getBusinessMembershipById(
      id,
      language,
      countryId,
    );
  }

  // ─── Admin Mutations ─────────────────────────────────────────────────────────

  @Mutation(() => PersonMembership)
  createPersonMembership(
    @Args('input') input: CreatePersonMembershipInput,
    @Context() ctx: { adminId?: string },
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.subscriptionService.createPersonMembership(
      input,
      ctx.adminId ?? '',
      language,
    );
  }

  @Mutation(() => BusinessMembership)
  createBusinessMembership(
    @Args('input') input: CreateBusinessMembershipInput,
    @Context() ctx: { adminId?: string },
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.subscriptionService.createBusinessMembership(
      input,
      ctx.adminId ?? '',
      language,
    );
  }

  @Mutation(() => PersonMembershipTranslation)
  upsertPersonMembershipTranslation(
    @Args('input') input: UpsertPersonMembershipTranslationInput,
    @Context() ctx: { adminId?: string },
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.subscriptionService.upsertPersonMembershipTranslation(
      input,
      ctx.adminId ?? '',
      language,
    );
  }

  @Mutation(() => BusinessMembershipTranslation)
  upsertBusinessMembershipTranslation(
    @Args('input') input: UpsertBusinessMembershipTranslationInput,
    @Context() ctx: { adminId?: string },
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.subscriptionService.upsertBusinessMembershipTranslation(
      input,
      ctx.adminId ?? '',
      language,
    );
  }

  @Mutation(() => PersonMembershipPricing)
  upsertPersonMembershipPricing(
    @Args('input') input: UpsertPersonMembershipPricingInput,
    @Context() ctx: { adminId?: string },
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.subscriptionService.upsertPersonMembershipPricing(
      input,
      ctx.adminId ?? '',
      language,
    );
  }

  @Mutation(() => BusinessMembershipPricing)
  upsertBusinessMembershipPricing(
    @Args('input') input: UpsertBusinessMembershipPricingInput,
    @Context() ctx: { adminId?: string },
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.subscriptionService.upsertBusinessMembershipPricing(
      input,
      ctx.adminId ?? '',
      language,
    );
  }

  // ─── Seller Mutations ─────────────────────────────────────────────────────────

  @Mutation(() => PersonMembershipSubscription)
  assignPersonMembership(
    @Args('input') input: CreatePersonMembershipSubscriptionInput,
    @CurrentSeller() sellerId: string,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.subscriptionService.assignPersonMembership(
      sellerId,
      input,
      language,
    );
  }

  @Mutation(() => BusinessMembershipSubscription)
  assignBusinessMembership(
    @Args('input') input: CreateBusinessMembershipSubscriptionInput,
    @CurrentSeller() sellerId: string,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.subscriptionService.assignBusinessMembership(
      sellerId,
      input,
      language,
    );
  }
}

// ─── PersonProfile field resolver (DataLoader) ────────────────────────────────

@Resolver(() => PersonProfile)
export class PersonProfileMembershipResolver {
  constructor(
    private readonly personMembershipLoader: PersonMembershipLoader,
  ) {}

  @ResolveField(() => PersonMembership, { nullable: true })
  async membership(
    @Parent()
    profile: PersonProfile & { personMembershipSubscriptionId?: number },
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
    @Args('countryId', { type: () => Int, nullable: true }) countryId?: number,
  ) {
    if (!profile.personMembershipSubscriptionId) return null;

    const raw = await this.personMembershipLoader.bySubscriptionId.load(
      profile.personMembershipSubscriptionId,
    );
    if (!raw) return null;

    return {
      ...raw,
      translation:
        raw.translations?.find((t: any) => t.language === language) ?? null,
      pricing:
        raw.pricing?.find(
          (p: any) =>
            p.isActive && (countryId == null || p.countryId === countryId),
        ) ?? null,
    };
  }
}

// ─── BusinessProfile field resolver (DataLoader) ─────────────────────────────

@Resolver(() => BusinessProfile)
export class BusinessProfileMembershipResolver {
  constructor(
    private readonly businessMembershipLoader: BusinessMembershipLoader,
  ) {}

  @ResolveField(() => BusinessMembership, { nullable: true })
  async membership(
    @Parent()
    profile: BusinessProfile & { businessMembershipSubscriptionId?: number },
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
    @Args('countryId', { type: () => Int, nullable: true }) countryId?: number,
  ) {
    if (!profile.businessMembershipSubscriptionId) return null;

    const raw = await this.businessMembershipLoader.bySubscriptionId.load(
      profile.businessMembershipSubscriptionId,
    );
    if (!raw) return null;

    return {
      ...raw,
      translation:
        raw.translations?.find((t: any) => t.language === language) ?? null,
      pricing:
        raw.pricing?.find(
          (p: any) =>
            p.isActive && (countryId == null || p.countryId === countryId),
        ) ?? null,
    };
  }
}
