import { Resolver, Mutation, Args, Int } from '@nestjs/graphql';
import { AccountService } from './account.service';
import { Seller } from '../sellers/entities';
import { CurrentSeller } from '../common/decorators';
import { Language } from '../graphql/enums';

@Resolver()
export class AccountResolver {
  constructor(private readonly accountService: AccountService) {}

  @Mutation(() => Seller)
  async updatePassword(
    @Args('currentPassword') currentPassword: string,
    @Args('newPassword') newPassword: string,
    @CurrentSeller() sellerId: string,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.accountService.updatePassword(
      sellerId,
      currentPassword,
      newPassword,
      language,
    );
  }

  @Mutation(() => Boolean)
  requestPasswordReset(@Args('email') email: string) {
    return this.accountService.requestPasswordReset(email);
  }

  @Mutation(() => Seller)
  async deactivateAccount(
    @CurrentSeller() sellerId: string,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.accountService.deactivateAccount(sellerId, language);
  }

  @Mutation(() => Seller)
  async reactivateAccount(
    @CurrentSeller() sellerId: string,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.accountService.reactivateAccount(sellerId, language);
  }

  @Mutation(() => Seller)
  async addPoints(
    @Args('id') id: string,
    @Args('points', { type: () => Int }) points: number,
    @CurrentSeller() sellerId: string,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.accountService.addPoints(sellerId, id, points, language);
  }

  @Mutation(() => Seller)
  async deductPoints(
    @Args('id') id: string,
    @Args('points', { type: () => Int }) points: number,
    @CurrentSeller() sellerId: string,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.accountService.deductPoints(sellerId, id, points, language);
  }

  @Mutation(() => Seller)
  async updateSellerCategory(
    @Args('id') id: string,
    @Args('categoryId', { type: () => Int }) categoryId: number,
    @CurrentSeller() sellerId: string,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.accountService.updateSellerCategory(
      sellerId,
      id,
      categoryId,
      language,
    );
  }
}
