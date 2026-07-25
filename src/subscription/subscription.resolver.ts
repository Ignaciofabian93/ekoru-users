import {
  Resolver,
  Query,
  Mutation,
  Args,
  Int,
  ID,
  Context,
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
  MembershipCharge,
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
  PersonMembershipUpsertRowInput,
  PersonMembershipTranslationUpsertRowInput,
  PersonMembershipPricingUpsertRowInput,
  BusinessMembershipUpsertRowInput,
  BusinessMembershipTranslationUpsertRowInput,
  BusinessMembershipPricingUpsertRowInput,
} from './dto';
import { PersonProfile } from '../sellers/entities/person-profile.entity';
import { BusinessProfile } from '../sellers/entities/business-profile.entity';
import { CurrentAdmin, CurrentSeller } from '../common/decorators';
import { UsersBulkUpsertResult } from '../common/bulk';
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

  // ─── Paid subscription flow (transactions subgraph) ──────────────────────────

  /**
   * Server-side price for one term of a membership, for the given seller. Read
   * by the transactions subgraph before creating the platform Payment; also
   * usable by the web app to show the amount before checkout.
   */
  @Query(() => MembershipCharge, { name: 'getMembershipCharge' })
  async getMembershipCharge(
    @Args('membershipId', { type: () => Int }) membershipId: number,
    @Args('sellerId', { type: () => ID }) sellerId: string,
  ): Promise<MembershipCharge> {
    return this.subscriptionService.getMembershipCharge({
      membershipId,
      sellerId,
    });
  }

  /**
   * Internal: activates a paid subscription once the platform Payment
   * completed. Guarded by INTERNAL_SERVICE_SECRET — only the transactions
   * subgraph (which owns the Payment) may call it. Returns the subscription id.
   */
  @Mutation(() => Int, { name: 'activateMembershipSubscription' })
  async activateMembershipSubscription(
    @Args('sellerId', { type: () => ID }) sellerId: string,
    @Args('membershipId', { type: () => Int }) membershipId: number,
    @Args('paymentId', { type: () => Int }) paymentId: number,
    @Args('internalSecret', { type: () => String }) internalSecret: string,
    @Context() ctx: { internalSecret?: string },
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ): Promise<number> {
    this._assertInternal(ctx.internalSecret ?? internalSecret);
    const { subscriptionId } =
      await this.subscriptionService.activateMembershipSubscription({
        sellerId,
        membershipId,
        paymentId,
        language,
      });
    return subscriptionId;
  }

  /** Verifies the shared internal secret (header preferred, arg fallback). */
  private _assertInternal(supplied?: string) {
    const expected = process.env.INTERNAL_SERVICE_SECRET;
    if (!expected) {
      throw new Error('INTERNAL_SERVICE_SECRET no configurado en users');
    }
    if (supplied !== expected) {
      throw new Error('Unauthorized');
    }
  }

  // ─── Bulk upserts (admin panel XLSX import / row edits) ─────────────────────
  // Rows with an id update, rows without an id create; translation rows are
  // matched by (membershipId, language), pricing rows by (membershipId,
  // countryId). Per-row failures come back in errors[]. Admins only.

  @Mutation(() => UsersBulkUpsertResult, {
    description: 'Bulk create/update person memberships. Admins only.',
  })
  bulkUpsertPersonMemberships(
    @CurrentAdmin() adminId: string,
    @Args('rows', { type: () => [PersonMembershipUpsertRowInput] })
    rows: PersonMembershipUpsertRowInput[],
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.subscriptionService.bulkUpsertPersonMemberships({
      adminId,
      rows,
      language,
    });
  }

  @Mutation(() => UsersBulkUpsertResult, {
    description:
      'Bulk create/update person membership translations, matched by (personMembershipId, language). Admins only.',
  })
  bulkUpsertPersonMembershipTranslations(
    @CurrentAdmin() adminId: string,
    @Args('rows', { type: () => [PersonMembershipTranslationUpsertRowInput] })
    rows: PersonMembershipTranslationUpsertRowInput[],
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.subscriptionService.bulkUpsertPersonMembershipTranslations({
      adminId,
      rows,
      language,
    });
  }

  @Mutation(() => UsersBulkUpsertResult, {
    description:
      'Bulk create/update person membership pricing, matched by (personMembershipId, countryId). Admins only.',
  })
  bulkUpsertPersonMembershipPricing(
    @CurrentAdmin() adminId: string,
    @Args('rows', { type: () => [PersonMembershipPricingUpsertRowInput] })
    rows: PersonMembershipPricingUpsertRowInput[],
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.subscriptionService.bulkUpsertPersonMembershipPricing({
      adminId,
      rows,
      language,
    });
  }

  @Mutation(() => UsersBulkUpsertResult, {
    description: 'Bulk create/update business memberships. Admins only.',
  })
  bulkUpsertBusinessMemberships(
    @CurrentAdmin() adminId: string,
    @Args('rows', { type: () => [BusinessMembershipUpsertRowInput] })
    rows: BusinessMembershipUpsertRowInput[],
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.subscriptionService.bulkUpsertBusinessMemberships({
      adminId,
      rows,
      language,
    });
  }

  @Mutation(() => UsersBulkUpsertResult, {
    description:
      'Bulk create/update business membership translations, matched by (businessMembershipId, language). Admins only.',
  })
  bulkUpsertBusinessMembershipTranslations(
    @CurrentAdmin() adminId: string,
    @Args('rows', { type: () => [BusinessMembershipTranslationUpsertRowInput] })
    rows: BusinessMembershipTranslationUpsertRowInput[],
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.subscriptionService.bulkUpsertBusinessMembershipTranslations({
      adminId,
      rows,
      language,
    });
  }

  @Mutation(() => UsersBulkUpsertResult, {
    description:
      'Bulk create/update business membership pricing, matched by (businessMembershipId, countryId). Admins only.',
  })
  bulkUpsertBusinessMembershipPricing(
    @CurrentAdmin() adminId: string,
    @Args('rows', { type: () => [BusinessMembershipPricingUpsertRowInput] })
    rows: BusinessMembershipPricingUpsertRowInput[],
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.subscriptionService.bulkUpsertBusinessMembershipPricing({
      adminId,
      rows,
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
