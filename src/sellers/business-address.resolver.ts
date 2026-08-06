import {
  Resolver,
  ResolveField,
  Parent,
  Mutation,
  Args,
  Int,
} from '@nestjs/graphql';
import { SellersService } from './sellers.service';
import { BusinessProfile } from './entities/business-profile.entity';
import { BusinessAddress } from './entities/business-address.entity';
import { AddBusinessAddressInput, UpdateBusinessAddressInput } from './dto';
import { CurrentSeller } from '../common/decorators';
import { Language } from '../graphql/enums';

/**
 * Business-address management. `addresses` is resolved lazily on BusinessProfile;
 * the mutations are scoped to the authenticated seller's own business profile.
 */
@Resolver(() => BusinessProfile)
export class BusinessAddressResolver {
  constructor(private readonly sellersService: SellersService) {}

  @ResolveField(() => [BusinessAddress], { name: 'addresses' })
  addresses(@Parent() profile: { id: string }) {
    return this.sellersService.getBusinessAddresses(profile.id);
  }

  @Mutation(() => BusinessAddress)
  addBusinessAddress(
    @CurrentSeller() sellerId: string,
    @Args('input') input: AddBusinessAddressInput,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.sellersService.addBusinessAddress({
      sellerId,
      input,
      language,
    });
  }

  @Mutation(() => BusinessAddress)
  updateBusinessAddress(
    @CurrentSeller() sellerId: string,
    @Args('input') input: UpdateBusinessAddressInput,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.sellersService.updateBusinessAddress({
      sellerId,
      input,
      language,
    });
  }

  @Mutation(() => Boolean)
  deleteBusinessAddress(
    @CurrentSeller() sellerId: string,
    @Args('id', { type: () => Int }) id: number,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.sellersService.deleteBusinessAddress({
      sellerId,
      id,
      language,
    });
  }

  @Mutation(() => [BusinessAddress])
  setPrimaryBusinessAddress(
    @CurrentSeller() sellerId: string,
    @Args('id', { type: () => Int }) id: number,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.sellersService.setPrimaryBusinessAddress({
      sellerId,
      id,
      language,
    });
  }
}
