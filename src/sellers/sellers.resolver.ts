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
import { SellerType } from '../graphql/enums';

@Resolver(() => Seller)
export class SellersResolver {
  constructor(private readonly sellersService: SellersService) {}

  // Federation reference resolver
  @ResolveReference()
  async resolveReference(reference: { __typename: string; id: string }) {
    return this.sellersService.getSellerByIdForReference(reference.id);
  }

  // Queries
  @Query(() => [Seller], { name: 'sellers' })
  async getSellers(
    @CurrentSeller() sellerId: string,
    @Args('sellerType', { type: () => String, nullable: true })
    sellerType?: SellerType,
    @Args('isActive', { nullable: true }) isActive?: boolean,
    @Args('isVerified', { nullable: true }) isVerified?: boolean,
    @Args('limit', { type: () => Int, nullable: true }) limit?: number,
    @Args('offset', { type: () => Int, nullable: true }) offset?: number,
  ) {
    return this.sellersService.getSellers(
      sellerId,
      sellerType,
      isActive,
      isVerified,
      limit,
      offset,
    );
  }

  @Query(() => Seller, { name: 'seller', nullable: true })
  async getSeller(@Args('id') id: string, @CurrentSeller() sellerId: string) {
    return this.sellersService.getSellerById(id, sellerId);
  }

  @Query(() => Seller, { name: 'me', nullable: true })
  async getMe(@CurrentSeller() sellerId: string) {
    return this.sellersService.getMe(sellerId);
  }

  @Query(() => [SellerLevel], { name: 'sellerLevels' })
  async getSellerLevels() {
    return this.sellersService.getSellerLevels();
  }

  @Query(() => SellerLevel, { name: 'sellerLevel', nullable: true })
  async getSellerLevel(@Args('id') id: string) {
    return this.sellersService.getSellerLevel(id);
  }

  // Mutations
  @Mutation(() => Seller)
  async registerPerson(@Args('input') input: RegisterPersonInput) {
    return this.sellersService.registerPerson(input);
  }

  @Mutation(() => Seller)
  async registerBusiness(@Args('input') input: RegisterBusinessInput) {
    return this.sellersService.registerBusiness(input);
  }

  @Mutation(() => Seller)
  async updateSeller(
    @Args('input') input: UpdateSellerInput,
    @CurrentSeller() sellerId: string,
  ) {
    return this.sellersService.updateSeller(sellerId, input);
  }

  @Mutation(() => PersonProfile)
  async updatePersonProfile(
    @Args('input') input: UpdatePersonProfileInput,
    @CurrentSeller() sellerId: string,
  ) {
    return this.sellersService.updatePersonProfile(sellerId, input);
  }

  @Mutation(() => BusinessProfile)
  async updateBusinessProfile(
    @Args('input') input: UpdateBusinessProfileInput,
    @CurrentSeller() sellerId: string,
  ) {
    return this.sellersService.updateBusinessProfile(sellerId, input);
  }

  @Mutation(() => SellerPreferences)
  async updateSellerPreferences(
    @Args('input') input: UpdateSellerPreferencesInput,
    @CurrentSeller() sellerId: string,
  ) {
    return this.sellersService.updateSellerPreferences(sellerId, input);
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
