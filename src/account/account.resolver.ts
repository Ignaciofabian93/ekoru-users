import { Resolver, Mutation, Args, Int } from '@nestjs/graphql';
import { AccountService } from './account.service';
import { Seller } from '../sellers/entities';
import { CurrentSeller } from '../common/decorators';

@Resolver()
export class AccountResolver {
  constructor(private readonly accountService: AccountService) {}

  @Mutation(() => Seller)
  async updatePassword(
    @Args('currentPassword') currentPassword: string,
    @Args('newPassword') newPassword: string,
    @CurrentSeller() sellerId: string,
  ) {
    return this.accountService.updatePassword(
      sellerId,
      currentPassword,
      newPassword,
    );
  }

  @Mutation(() => Boolean)
  requestPasswordReset(@Args('email') email: string) {
    return this.accountService.requestPasswordReset(email);
  }

  @Mutation(() => Seller)
  async deactivateAccount(@CurrentSeller() sellerId: string) {
    return this.accountService.deactivateAccount(sellerId);
  }

  @Mutation(() => Seller)
  async reactivateAccount(@CurrentSeller() sellerId: string) {
    return this.accountService.reactivateAccount(sellerId);
  }

  @Mutation(() => Seller)
  async addPoints(
    @Args('id') id: string,
    @Args('points', { type: () => Int }) points: number,
    @CurrentSeller() sellerId: string,
  ) {
    return this.accountService.addPoints(sellerId, id, points);
  }

  @Mutation(() => Seller)
  async deductPoints(
    @Args('id') id: string,
    @Args('points', { type: () => Int }) points: number,
    @CurrentSeller() sellerId: string,
  ) {
    return this.accountService.deductPoints(sellerId, id, points);
  }

  @Mutation(() => Seller)
  async updateSellerCategory(
    @Args('id') id: string,
    @Args('categoryId', { type: () => Int }) categoryId: number,
    @CurrentSeller() sellerId: string,
  ) {
    return this.accountService.updateSellerCategory(sellerId, id, categoryId);
  }
}
