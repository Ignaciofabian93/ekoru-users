import {
  Resolver,
  Query,
  Mutation,
  Args,
  Int,
  ResolveField,
  Parent,
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
  RawPersonMembershipTranslationConnection,
  RawBusinessMembershipTranslationConnection,
  RawPersonMembershipPricingConnection,
  RawBusinessMembershipPricingConnection,
} from './entities';
import {
  CreatePersonMembershipInput,
  CreateBusinessMembershipInput,
  UpdatePersonMembershipInput,
  UpdateBusinessMembershipInput,
  CreatePersonMembershipSubscriptionInput,
  CreateBusinessMembershipSubscriptionInput,
  UpsertPersonMembershipTranslationInput,
  UpsertBusinessMembershipTranslationInput,
  UpsertPersonMembershipPricingInput,
  UpsertBusinessMembershipPricingInput,
} from './dto';
import { PersonProfile } from '../sellers/entities/person-profile.entity';
import { BusinessProfile } from '../sellers/entities/business-profile.entity';
import { CurrentAdmin, CurrentSeller } from '../common/decorators';
import { Language } from '../graphql/enums';

// ─── Membership Queries & Mutations ──────────────────────────────────────────

@Resolver(() => PersonMembership)
export class SubscriptionResolver {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  // ─── Raw admin-panel reads (Admin only) ──────────────────────────────────────
  // Return membership translation/pricing rows exactly as stored so the admin
  // panel can edit every language and per-country price directly.

  @Query(() => RawPersonMembershipTranslationConnection, {
    name: 'rawPersonMembershipTranslations',
    description:
      'Paginated, unprocessed list of person-membership translations for the ' +
      'admin panel. Optionally filtered by personMembershipId. Admins only.',
  })
  getRawPersonMembershipTranslations(
    @CurrentAdmin() adminId: string,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
    @Args('personMembershipId', { type: () => Int, nullable: true })
    personMembershipId?: number,
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number = 1,
    @Args('pageSize', { type: () => Int, defaultValue: 10 })
    pageSize: number = 10,
  ) {
    return this.subscriptionService.getRawPersonMembershipTranslations({
      adminId,
      language,
      personMembershipId,
      page,
      pageSize,
    });
  }

  @Query(() => RawBusinessMembershipTranslationConnection, {
    name: 'rawBusinessMembershipTranslations',
    description:
      'Paginated, unprocessed list of business-membership translations for the ' +
      'admin panel. Optionally filtered by businessMembershipId. Admins only.',
  })
  getRawBusinessMembershipTranslations(
    @CurrentAdmin() adminId: string,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
    @Args('businessMembershipId', { type: () => Int, nullable: true })
    businessMembershipId?: number,
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number = 1,
    @Args('pageSize', { type: () => Int, defaultValue: 10 })
    pageSize: number = 10,
  ) {
    return this.subscriptionService.getRawBusinessMembershipTranslations({
      adminId,
      language,
      businessMembershipId,
      page,
      pageSize,
    });
  }

  @Query(() => RawPersonMembershipPricingConnection, {
    name: 'rawPersonMembershipPricing',
    description:
      'Paginated, unprocessed list of person-membership pricing for the admin ' +
      'panel. Optionally filtered by personMembershipId and/or countryId. Admins only.',
  })
  getRawPersonMembershipPricing(
    @CurrentAdmin() adminId: string,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
    @Args('personMembershipId', { type: () => Int, nullable: true })
    personMembershipId?: number,
    @Args('countryId', { type: () => Int, nullable: true }) countryId?: number,
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number = 1,
    @Args('pageSize', { type: () => Int, defaultValue: 10 })
    pageSize: number = 10,
  ) {
    return this.subscriptionService.getRawPersonMembershipPricing({
      adminId,
      language,
      personMembershipId,
      countryId,
      page,
      pageSize,
    });
  }

  @Query(() => RawBusinessMembershipPricingConnection, {
    name: 'rawBusinessMembershipPricing',
    description:
      'Paginated, unprocessed list of business-membership pricing for the admin ' +
      'panel. Optionally filtered by businessMembershipId and/or countryId. Admins only.',
  })
  getRawBusinessMembershipPricing(
    @CurrentAdmin() adminId: string,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
    @Args('businessMembershipId', { type: () => Int, nullable: true })
    businessMembershipId?: number,
    @Args('countryId', { type: () => Int, nullable: true }) countryId?: number,
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number = 1,
    @Args('pageSize', { type: () => Int, defaultValue: 10 })
    pageSize: number = 10,
  ) {
    return this.subscriptionService.getRawBusinessMembershipPricing({
      adminId,
      language,
      businessMembershipId,
      countryId,
      page,
      pageSize,
    });
  }

  @Query(() => [PersonMembership], { name: 'personMemberships' })
  getPersonMemberships(
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
    @Args('countryId', { type: () => Int, nullable: true }) countryId?: number,
  ) {
    return this.subscriptionService.getPersonMemberships({
      language,
      countryId,
    });
  }

  @Query(() => PersonMembership, { name: 'personMembership', nullable: true })
  getPersonMembership(
    @Args('id', { type: () => Int }) id: number,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
    @Args('countryId', { type: () => Int, nullable: true }) countryId?: number,
  ) {
    return this.subscriptionService.getPersonMembershipById({
      id,
      language,
      countryId,
    });
  }

  @Query(() => [BusinessMembership], { name: 'businessMemberships' })
  getBusinessMemberships(
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
    @Args('countryId', { type: () => Int, nullable: true }) countryId?: number,
  ) {
    return this.subscriptionService.getBusinessMemberships({
      language,
      countryId,
    });
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
    return this.subscriptionService.getBusinessMembershipById({
      id,
      language,
      countryId,
    });
  }

  // ─── Admin Mutations ─────────────────────────────────────────────────────────

  @Mutation(() => PersonMembership)
  createPersonMembership(
    @Args('input') input: CreatePersonMembershipInput,
    @CurrentAdmin() adminId: string,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.subscriptionService.createPersonMembership({
      input,
      adminId,
      language,
    });
  }

  @Mutation(() => BusinessMembership)
  createBusinessMembership(
    @Args('input') input: CreateBusinessMembershipInput,
    @CurrentAdmin() adminId: string,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.subscriptionService.createBusinessMembership({
      input,
      adminId,
      language,
    });
  }

  @Mutation(() => PersonMembershipTranslation)
  upsertPersonMembershipTranslation(
    @Args('input') input: UpsertPersonMembershipTranslationInput,
    @CurrentAdmin() adminId: string,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.subscriptionService.upsertPersonMembershipTranslation({
      input,
      adminId,
      language,
    });
  }

  @Mutation(() => BusinessMembershipTranslation)
  upsertBusinessMembershipTranslation(
    @Args('input') input: UpsertBusinessMembershipTranslationInput,
    @CurrentAdmin() adminId: string,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.subscriptionService.upsertBusinessMembershipTranslation({
      input,
      adminId,
      language,
    });
  }

  @Mutation(() => PersonMembershipPricing)
  upsertPersonMembershipPricing(
    @Args('input') input: UpsertPersonMembershipPricingInput,
    @CurrentAdmin() adminId: string,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.subscriptionService.upsertPersonMembershipPricing({
      input,
      adminId,
      language,
    });
  }

  @Mutation(() => BusinessMembershipPricing)
  upsertBusinessMembershipPricing(
    @Args('input') input: UpsertBusinessMembershipPricingInput,
    @CurrentAdmin() adminId: string,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.subscriptionService.upsertBusinessMembershipPricing({
      input,
      adminId,
      language,
    });
  }

  @Mutation(() => PersonMembership)
  updatePersonMembership(
    @Args('id', { type: () => Int }) id: number,
    @Args('input') input: UpdatePersonMembershipInput,
    @CurrentAdmin() adminId: string,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.subscriptionService.updatePersonMembership({
      id,
      input,
      adminId,
      language,
    });
  }

  @Mutation(() => BusinessMembership)
  updateBusinessMembership(
    @Args('id', { type: () => Int }) id: number,
    @Args('input') input: UpdateBusinessMembershipInput,
    @CurrentAdmin() adminId: string,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.subscriptionService.updateBusinessMembership({
      id,
      input,
      adminId,
      language,
    });
  }

  @Mutation(() => PersonMembership, {
    description:
      'Soft delete (deactivate) a person membership plan. Keeps the record and existing subscriptions.',
  })
  deletePersonMembership(
    @Args('id', { type: () => Int }) id: number,
    @CurrentAdmin() adminId: string,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.subscriptionService.deletePersonMembership({
      id,
      adminId,
      language,
    });
  }

  @Mutation(() => BusinessMembership, {
    description:
      'Soft delete (deactivate) a business membership plan. Keeps the record and existing subscriptions.',
  })
  deleteBusinessMembership(
    @Args('id', { type: () => Int }) id: number,
    @CurrentAdmin() adminId: string,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.subscriptionService.deleteBusinessMembership({
      id,
      adminId,
      language,
    });
  }

  @Mutation(() => PersonMembershipTranslation)
  deletePersonMembershipTranslation(
    @Args('personMembershipId', { type: () => Int }) personMembershipId: number,
    @Args('translationLanguage', { type: () => Language })
    translationLanguage: Language,
    @CurrentAdmin() adminId: string,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.subscriptionService.deletePersonMembershipTranslation({
      personMembershipId,
      translationLanguage,
      adminId,
      language,
    });
  }

  @Mutation(() => BusinessMembershipTranslation)
  deleteBusinessMembershipTranslation(
    @Args('businessMembershipId', { type: () => Int })
    businessMembershipId: number,
    @Args('translationLanguage', { type: () => Language })
    translationLanguage: Language,
    @CurrentAdmin() adminId: string,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.subscriptionService.deleteBusinessMembershipTranslation({
      businessMembershipId,
      translationLanguage,
      adminId,
      language,
    });
  }

  @Mutation(() => PersonMembershipPricing)
  deletePersonMembershipPricing(
    @Args('personMembershipId', { type: () => Int }) personMembershipId: number,
    @Args('countryId', { type: () => Int }) countryId: number,
    @CurrentAdmin() adminId: string,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.subscriptionService.deletePersonMembershipPricing({
      personMembershipId,
      countryId,
      adminId,
      language,
    });
  }

  @Mutation(() => BusinessMembershipPricing)
  deleteBusinessMembershipPricing(
    @Args('businessMembershipId', { type: () => Int })
    businessMembershipId: number,
    @Args('countryId', { type: () => Int }) countryId: number,
    @CurrentAdmin() adminId: string,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.subscriptionService.deleteBusinessMembershipPricing({
      businessMembershipId,
      countryId,
      adminId,
      language,
    });
  }

  // ─── Seller Mutations ─────────────────────────────────────────────────────────

  @Mutation(() => PersonMembershipSubscription)
  assignPersonMembership(
    @Args('input') input: CreatePersonMembershipSubscriptionInput,
    @CurrentSeller() sellerId: string,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.subscriptionService.assignPersonMembership({
      sellerId,
      input,
      language,
    });
  }

  @Mutation(() => BusinessMembershipSubscription)
  assignBusinessMembership(
    @Args('input') input: CreateBusinessMembershipSubscriptionInput,
    @CurrentSeller() sellerId: string,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.subscriptionService.assignBusinessMembership({
      sellerId,
      input,
      language,
    });
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
