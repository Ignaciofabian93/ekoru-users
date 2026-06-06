import {
  Resolver,
  Query,
  Mutation,
  Args,
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
} from './dto';
import { SellerPreferences } from './entities/seller-preferences.entity';
import { CurrentSeller } from '../common/decorators';
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
    name: 'sellers',
    description: 'Get a paginated list of sellers',
  })
  async getSellers(
    @CurrentSeller() sellerId: string,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
    @Args('sellerType', { type: () => String, nullable: true })
    sellerType?: SellerType,
    @Args('isActive', { nullable: true }) isActive?: boolean,
    @Args('isVerified', { nullable: true }) isVerified?: boolean,
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number = 1,
    @Args('pageSize', { type: () => Int, defaultValue: 10 })
    pageSize: number = 10,
  ) {
    return this.sellersService.getSellers(
      sellerId,
      language,
      sellerType,
      isActive,
      isVerified,
      page,
      pageSize,
    );
  }

  @Query(() => Seller, { name: 'seller', nullable: true })
  async getSeller(
    @Args('id') id: string,
    @CurrentSeller() sellerId: string,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.sellersService.getSellerById(id, sellerId, language);
  }

  @Query(() => Seller, { name: 'me', nullable: true })
  async getMe(
    @CurrentSeller() sellerId: string,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.sellersService.getMe(sellerId, language);
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
    @Args('id') id: string,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.sellersService.getSellerLevel(id, language);
  }

  // Mutations
  @Mutation(() => Seller)
  async registerPerson(
    @Args('input') input: RegisterPersonInput,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.sellersService.registerPerson(input, language);
  }

  @Mutation(() => Seller)
  async registerBusiness(
    @Args('input') input: RegisterBusinessInput,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.sellersService.registerBusiness(input, language);
  }

  @Mutation(() => Seller)
  async updateSeller(
    @Args('input') input: UpdateSellerInput,
    @CurrentSeller() sellerId: string,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.sellersService.updateSeller(sellerId, input, language);
  }

  @Mutation(() => PersonProfile)
  async updatePersonProfile(
    @Args('input') input: UpdatePersonProfileInput,
    @CurrentSeller() sellerId: string,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.sellersService.updatePersonProfile(sellerId, input, language);
  }

  @Mutation(() => BusinessProfile)
  async updateBusinessProfile(
    @Args('input') input: UpdateBusinessProfileInput,
    @CurrentSeller() sellerId: string,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.sellersService.updateBusinessProfile(sellerId, input, language);
  }

  @Mutation(() => SellerPreferences)
  async updateSellerPreferences(
    @Args('input') input: UpdateSellerPreferencesInput,
    @CurrentSeller() sellerId: string,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.sellersService.updateSellerPreferences(
      sellerId,
      input,
      language,
    );
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
