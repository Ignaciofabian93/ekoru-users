import {
  Resolver,
  Query,
  Mutation,
  Args,
  ID,
  Int,
  ResolveField,
  Parent,
  ResolveReference,
} from '@nestjs/graphql';
import { SellersService } from './sellers.service';
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
  UpdateSellerInput,
  UpdatePersonProfileInput,
  UpdateBusinessProfileInput,
  UpdateSellerPreferencesInput,
  BanSellerInput,
} from './dto';
import { SellerPreferences } from './entities/seller-preferences.entity';
import { CurrentAdmin, CurrentSeller } from '../common/decorators';
import { Language, SellerType } from '../graphql/enums';

@Resolver(() => Seller)
export class SellersResolver {
  constructor(private readonly sellersService: SellersService) {}

  // Federation reference resolver
  @ResolveReference()
  async resolveReference(reference: { __typename: string; id: string }) {
    return this.sellersService.getSellerByIdForReference(reference.id);
  }

  // Queries
  @Query(() => SellerConnection, {
    name: 'getSellers',
    description: 'Get a paginated list of sellers',
  })
  async getSellers(
    @CurrentAdmin() adminId: string,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
    @Args('sellerType', { type: () => String, nullable: true })
    sellerType?: SellerType,
    @Args('isActive', { nullable: true }) isActive?: boolean,
    @Args('isVerified', { nullable: true }) isVerified?: boolean,
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number = 1,
    @Args('pageSize', { type: () => Int, defaultValue: 10 })
    pageSize: number = 10,
    @Args('searchQuery', { nullable: true }) searchQuery?: string,
  ) {
    return this.sellersService.getSellers({
      adminId,
      language,
      sellerType,
      isActive,
      isVerified,
      page,
      pageSize,
      searchQuery,
    });
  }

  @Query(() => Seller, { name: 'getSeller', nullable: true })
  async getSeller(
    @CurrentSeller() sellerId: string,
    @CurrentAdmin() adminId: string,
    @Args('id', { type: () => ID }) id: string,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.sellersService.getSellerById({
      id,
      sellerId,
      language,
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
  @Mutation(() => Seller)
  async registerPerson(
    @Args('input') input: RegisterPersonInput,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.sellersService.registerPerson({ input, language });
  }

  @Mutation(() => Seller)
  async registerBusiness(
    @Args('input') input: RegisterBusinessInput,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.sellersService.registerBusiness({ input, language });
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
