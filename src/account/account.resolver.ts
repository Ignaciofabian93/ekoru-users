import { Resolver, Mutation, Args, Int } from '@nestjs/graphql';
import { AccountService } from './account.service';
import { Seller } from '../sellers/entities';
import { CurrentSeller } from '../common/decorators';
import { Language } from '../graphql/enums';

@Resolver()
export class AccountResolver {
  constructor(private readonly accountService: AccountService) {}

  @Mutation(() => Seller, {
    name: 'updatePassword',
    description: 'Update the password of the current seller',
  })
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

  @Mutation(() => Boolean, {
    name: 'requestPasswordReset',
    description: 'Request a password reset for a seller',
  })
  requestPasswordReset(@Args('email') email: string) {
    return this.accountService.requestPasswordReset(email);
  }

  @Mutation(() => Seller, {
    name: 'deactivateAccount',
    description: 'Deactivate the account of the current seller',
  })
  async deactivateAccount(
    @CurrentSeller() sellerId: string,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.accountService.deactivateAccount(sellerId, language);
  }

  @Mutation(() => Seller, {
    name: 'reactivateAccount',
    description: 'Reactivate the account of the current seller',
  })
  async reactivateAccount(
    @CurrentSeller() sellerId: string,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.accountService.reactivateAccount(sellerId, language);
  }

  @Mutation(() => Seller, {
    name: 'addPoints',
    description: 'Add points to a seller',
  })
  async addPoints(
    @Args('id') id: string,
    @Args('points', { type: () => Int }) points: number,
    @CurrentSeller() sellerId: string,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.accountService.addPoints(sellerId, id, points, language);
  }

  @Mutation(() => Seller, {
    name: 'deductPoints',
    description: 'Deduct points from a seller',
  })
  async deductPoints(
    @Args('id') id: string,
    @Args('points', { type: () => Int }) points: number,
    @CurrentSeller() sellerId: string,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.accountService.deductPoints(sellerId, id, points, language);
  }

  @Mutation(() => Seller, {
    name: 'updateSellerCategory',
    description: 'Update the category of a seller',
  })
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
