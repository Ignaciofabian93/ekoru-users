import {
  Resolver,
  Query,
  Mutation,
  Args,
  ID,
  Int,
  Context,
  ResolveField,
  Parent,
  ResolveReference,
  Directive,
} from '@nestjs/graphql';
import { Throttle } from '@nestjs/throttler';
import { SellersService } from './sellers.service';
import { DateTimeScalar } from '../graphql/scalars';
import {
  Seller,
  SellerConnection,
  SellerLevel,
  PersonProfile,
  BusinessProfile,
  Profile,
} from './entities';
import {
  RegisterPersonInput,
  RegisterBusinessInput,
  ReapplyBusinessInput,
  UpdateSellerInput,
  UpdatePersonProfileInput,
  UpdateBusinessProfileInput,
  UpdateSellerPreferencesInput,
  BanSellerInput,
} from './dto';
import { SellerPreferences } from './entities/seller-preferences.entity';
import { CurrentAdmin, CurrentSeller } from '../common/decorators';
import {
  BusinessApprovalStatus,
  BusinessType,
  Language,
  SellerType,
} from '../graphql/enums';

@Resolver(() => Seller)
export class SellersResolver {
  constructor(private readonly sellersService: SellersService) {}

  // Federation reference resolver
  @ResolveReference()
  async resolveReference(reference: { __typename: string; id: string }) {
    return this.sellersService.getSellerByIdForReference(reference.id);
  }

  /**
   * Internal: credit eco-points to a seller. Called by the transactions
   * subgraph when a P2P deal completes — guarded by INTERNAL_SERVICE_SECRET.
   * Returns the seller's new points total.
   */
  // Internal: hidden from the public supergraph (GW-2); sibling services call it on this subgraph directly.
  @Directive('@inaccessible')
  @Mutation(() => Int, { name: 'awardPoints' })
  async awardPoints(
    @Args('sellerId', { type: () => ID }) sellerId: string,
    @Args('points', { type: () => Int }) points: number,
    @Context() ctx: { internalSecret?: string },
  ): Promise<number> {
    // Header-only: the `internalSecret` argument was removed because the
    // gateway attached the header to every federated request, which made this
    // callable by anonymous clients.
    const expected = process.env.INTERNAL_SERVICE_SECRET;
    if (!expected) throw new Error('INTERNAL_SERVICE_SECRET no configurado');
    if (!ctx.internalSecret || ctx.internalSecret !== expected) {
      throw new Error('Unauthorized');
    }
    return this.sellersService.awardPoints(sellerId, points);
  }

  // Queries
  @Query(() => SellerConnection, {
    name: 'getSellers',
    description:
      'Paginated sellers. The public sees approved businesses only; an admin ' +
      'token needs MANAGE_USERS and sees every account.',
  })
  async getSellers(
    @CurrentAdmin() adminId: string | undefined,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
    @Args('sellerType', { type: () => SellerType, nullable: true })
    sellerType?: SellerType,
    @Args('businessType', { type: () => BusinessType, nullable: true })
    businessType?: BusinessType,
    @Args('approvalStatus', {
      type: () => BusinessApprovalStatus,
      nullable: true,
      description:
        'Admin filter on the business review state. Non-admin callers only ever ' +
        'see approved businesses.',
    })
    approvalStatus?: BusinessApprovalStatus,
    @Args('isActive', { nullable: true }) isActive?: boolean,
    @Args('isVerified', { nullable: true }) isVerified?: boolean,
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number = 1,
    @Args('pageSize', { type: () => Int, defaultValue: 10 })
    pageSize: number = 10,
    @Args('searchQuery', { nullable: true }) searchQuery?: string,
    @Args('createdAfter', {
      type: () => DateTimeScalar,
      nullable: true,
      description:
        "Accounts created on or after this moment (the dashboard's new sign-ups).",
    })
    createdAfter?: Date,
  ) {
    return this.sellersService.getSellers({
      createdAfter,
      language,
      adminId,
      sellerType,
      businessType,
      approvalStatus,
      isActive,
      isVerified,
      page,
      pageSize,
      searchQuery,
    });
  }

  @Query(() => Seller, {
    name: 'getSeller',
    nullable: true,
    description:
      'One seller by id. A business EKORU has not approved reads as null except ' +
      'for itself, its business admin account and admins with MANAGE_USERS.',
  })
  async getSeller(
    @Args('id', { type: () => ID }) id: string,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
    @CurrentSeller() sellerId?: string,
    @CurrentAdmin() adminId?: string,
  ) {
    return this.sellersService.getSellerById({
      id,
      language,
      sellerId,
      adminId,
    });
  }

  @Query(() => Seller, { name: 'me', nullable: true })
  async getMe(
    @CurrentSeller() sellerId: string,
    @CurrentAdmin() adminId: string,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.sellersService.getMe({ sellerId, language, adminId });
  }

  @Query(() => [SellerLevel], { name: 'sellerLevels' })
  async getSellerLevels(
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.sellersService.getSellerLevels(language);
  }

  @Query(() => SellerLevel, { name: 'sellerLevel', nullable: true })
  async getSellerLevel(
    @Args('id', { type: () => ID }) id: string,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.sellersService.getSellerLevel({ id, language });
  }

  // Mutations
  // 5 a minute per visitor: each call can send an email (or tries a token).
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Mutation(() => Seller)
  async registerPerson(
    @Args('input') input: RegisterPersonInput,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.sellersService.registerPerson({ input, language });
  }

  // 5 a minute per visitor: each call can send an email (or tries a token).
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Mutation(() => Seller)
  async registerBusiness(
    @Args('input') input: RegisterBusinessInput,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.sellersService.registerBusiness({ input, language });
  }

  // 5 a minute per visitor: each call checks a password and sends two emails.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Mutation(() => Boolean, {
    name: 'reapplyBusiness',
    description:
      'A rejected business resubmits its application with its email and ' +
      'password (it cannot sign in yet). Moves it back to PENDING and emails ' +
      "EKORU's review inbox. Public; failed passwords count toward the login lock.",
  })
  async reapplyBusiness(
    @Args('input') input: ReapplyBusinessInput,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.sellersService.reapplyBusiness({ input, language });
  }

  @Mutation(() => Seller)
  async updateSeller(
    @CurrentSeller() sellerId: string,
    @CurrentAdmin() adminId: string,
    @Args('input') input: UpdateSellerInput,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.sellersService.updateSeller({
      sellerId,
      adminId,
      input,
      language,
    });
  }

  @Mutation(() => PersonProfile)
  async updatePersonProfile(
    @CurrentSeller() sellerId: string,
    @CurrentAdmin() adminId: string,
    @Args('input') input: UpdatePersonProfileInput,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.sellersService.updatePersonProfile({
      sellerId,
      adminId,
      input,
      language,
    });
  }

  @Mutation(() => BusinessProfile)
  async updateBusinessProfile(
    @CurrentSeller() sellerId: string,
    @CurrentAdmin() adminId: string,
    @Args('input') input: UpdateBusinessProfileInput,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.sellersService.updateBusinessProfile({
      sellerId,
      adminId,
      input,
      language,
    });
  }

  @Mutation(() => SellerPreferences)
  async updateSellerPreferences(
    @CurrentSeller() sellerId: string,
    @CurrentAdmin() adminId: string,
    @Args('input') input: UpdateSellerPreferencesInput,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.sellersService.updateSellerPreferences({
      sellerId,
      adminId,
      input,
      language,
    });
  }

  @Mutation(() => Seller, {
    name: 'verifySeller',
    description:
      "Toggle a seller's verified status after admin review. Requires MANAGE_USERS.",
  })
  async verifySeller(
    @CurrentAdmin() adminId: string,
    @Args('id', { type: () => ID }) id: string,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.sellersService.verifySeller({ adminId, id, language });
  }

  @Mutation(() => Seller, {
    name: 'approveBusiness',
    description:
      'Approve a business after onboarding review so it can sign in. Works on ' +
      'PENDING and REJECTED businesses; emails the business. Requires MANAGE_USERS.',
  })
  async approveBusiness(
    @CurrentAdmin() adminId: string,
    @Args('id', { type: () => ID }) id: string,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.sellersService.approveBusiness({ adminId, id, language });
  }

  @Mutation(() => Seller, {
    name: 'rejectBusiness',
    description:
      'Reject a PENDING business application. The reason (>= 10 chars) is ' +
      'emailed to the business. Requires MANAGE_USERS.',
  })
  async rejectBusiness(
    @CurrentAdmin() adminId: string,
    @Args('id', { type: () => ID }) id: string,
    @Args('reason') reason: string,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.sellersService.rejectBusiness({
      adminId,
      id,
      reason,
      language,
    });
  }

  @Mutation(() => Seller, {
    name: 'banSeller',
    description:
      'Ban a seller. Hard-blocked if the seller still has open orders, payments, ' +
      'refunds, quotations, bookings or exchanges. Deactivates and unverifies the ' +
      'account and records a ban history row. Requires BAN_USERS.',
  })
  async banSeller(
    @CurrentAdmin() adminId: string,
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: BanSellerInput,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.sellersService.banSeller({ adminId, id, input, language });
  }

  @Mutation(() => Seller, {
    name: 'reinstateSeller',
    description:
      "Lift a seller's active ban and reactivate the account. Verification is not " +
      'restored automatically. Requires BAN_USERS.',
  })
  async reinstateSeller(
    @CurrentAdmin() adminId: string,
    @Args('id', { type: () => ID }) id: string,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
    @Args('unbanReason', { nullable: true }) unbanReason?: string,
  ) {
    return this.sellersService.reinstateSeller({
      adminId,
      id,
      language,
      unbanReason,
    });
  }

  // Field resolvers
  @ResolveField(() => Profile, { nullable: true })
  profile(@Parent() seller: any) {
    return this.sellersService.resolveProfile(seller);
  }

  @ResolveField()
  country(@Parent() seller: any) {
    return seller.country || null;
  }

  @ResolveField()
  region(@Parent() seller: any) {
    return seller.region || null;
  }

  @ResolveField()
  city(@Parent() seller: any) {
    return seller.city || null;
  }

  @ResolveField()
  county(@Parent() seller: any) {
    return seller.county || null;
  }

  @ResolveField()
  sellerLevel(@Parent() seller: any) {
    return seller.sellerLevel || null;
  }

  @ResolveField()
  preferences(@Parent() seller: any) {
    return seller.sellerPreferences || null;
  }
}
