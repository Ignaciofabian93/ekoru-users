import { Resolver, Query, Mutation, Args, ID, Int } from '@nestjs/graphql';
import { AccountService } from './account.service';
import { Seller, SellerLevel } from '../sellers/entities';
import { SellerLabel, SellerLabelTranslation } from './entities';
import { SellerLevelTranslation } from '../sellers/entities';
import {
  CreateSellerLabelInput,
  UpdateSellerLabelInput,
  UpsertSellerLabelTranslationInput,
  CreateSellerLevelInput,
  UpdateSellerLevelInput,
  UpsertSellerLevelTranslationInput,
} from './dto';
import { CurrentAdmin, CurrentSeller } from '../common/decorators';
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
    return this.accountService.updatePassword({
      sellerId,
      currentPassword,
      newPassword,
      language,
    });
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
    return this.accountService.deactivateAccount({ sellerId, language });
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
    return this.accountService.reactivateAccount({ sellerId, language });
  }

  @Mutation(() => Seller, {
    name: 'addPoints',
    description: 'Add points to a seller',
  })
  async addPoints(
    @Args('id', { type: () => ID }) id: string,
    @Args('points', { type: () => Int }) points: number,
    @CurrentAdmin() adminId: string,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.accountService.addPoints({
      adminId,
      targetId: id,
      points,
      language,
    });
  }

  @Mutation(() => Seller, {
    name: 'deductPoints',
    description: 'Deduct points from a seller',
  })
  async deductPoints(
    @Args('id', { type: () => ID }) id: string,
    @Args('points', { type: () => Int }) points: number,
    @CurrentAdmin() adminId: string,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.accountService.deductPoints({
      adminId,
      targetId: id,
      points,
      language,
    });
  }

  @Mutation(() => Seller, {
    name: 'updateSellerCategory',
    description: 'Update the category of a seller',
  })
  async updateSellerCategory(
    @Args('id', { type: () => ID }) id: string,
    @Args('categoryId', { type: () => Int }) categoryId: number,
    @CurrentAdmin() adminId: string,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.accountService.updateSellerCategory({
      adminId,
      targetId: id,
      categoryId,
      language,
    });
  }

  // ─── Seller Labels ────────────────────────────────────────────────────────────

  @Query(() => [SellerLabel], { name: 'sellerLabels' })
  getSellerLabels(
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.accountService.getSellerLabels(language);
  }

  @Query(() => SellerLabel, { name: 'sellerLabel', nullable: true })
  getSellerLabel(
    @Args('id', { type: () => Int }) id: number,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.accountService.getSellerLabelById({ id, language });
  }

  @Mutation(() => SellerLabel, {
    name: 'createSellerLabel',
    description: 'Create a seller label. Admins only.',
  })
  createSellerLabel(
    @CurrentAdmin() adminId: string,
    @Args('input') input: CreateSellerLabelInput,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.accountService.createSellerLabel({
      adminId,
      input,
      language,
    });
  }

  @Mutation(() => SellerLabel, {
    name: 'updateSellerLabel',
    description: 'Update a seller label. Admins only.',
  })
  updateSellerLabel(
    @CurrentAdmin() adminId: string,
    @Args('id', { type: () => Int }) id: number,
    @Args('input') input: UpdateSellerLabelInput,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.accountService.updateSellerLabel({
      adminId,
      id,
      input,
      language,
    });
  }

  @Mutation(() => SellerLabel, {
    name: 'deleteSellerLabel',
    description:
      'Delete a seller label. Fails if sellers have already earned it. Admins only.',
  })
  deleteSellerLabel(
    @CurrentAdmin() adminId: string,
    @Args('id', { type: () => Int }) id: number,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.accountService.deleteSellerLabel({
      adminId,
      id,
      language,
    });
  }

  @Mutation(() => SellerLabelTranslation, {
    name: 'upsertSellerLabelTranslation',
    description: 'Create or update a seller label translation. Admins only.',
  })
  upsertSellerLabelTranslation(
    @CurrentAdmin() adminId: string,
    @Args('input') input: UpsertSellerLabelTranslationInput,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.accountService.upsertSellerLabelTranslation({
      adminId,
      input,
      language,
    });
  }

  @Mutation(() => SellerLabelTranslation, {
    name: 'deleteSellerLabelTranslation',
    description: 'Delete a seller label translation. Admins only.',
  })
  deleteSellerLabelTranslation(
    @CurrentAdmin() adminId: string,
    @Args('sellerLabelId', { type: () => Int }) sellerLabelId: number,
    @Args('translationLanguage', { type: () => Language })
    translationLanguage: Language,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.accountService.deleteSellerLabelTranslation({
      adminId,
      sellerLabelId,
      translationLanguage,
      language,
    });
  }

  // ─── Seller Levels ────────────────────────────────────────────────────────────

  @Query(() => [SellerLevel], { name: 'sellerLevels' })
  getSellerLevels(
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.accountService.getSellerLevels(language);
  }

  @Query(() => SellerLevel, { name: 'sellerLevel', nullable: true })
  getSellerLevel(
    @Args('id', { type: () => Int }) id: number,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.accountService.getSellerLevelById({ id, language });
  }

  @Mutation(() => SellerLevel, {
    name: 'createSellerLevel',
    description: 'Create a seller level. Admins only.',
  })
  createSellerLevel(
    @CurrentAdmin() adminId: string,
    @Args('input') input: CreateSellerLevelInput,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.accountService.createSellerLevel({
      adminId,
      input,
      language,
    });
  }

  @Mutation(() => SellerLevel, {
    name: 'updateSellerLevel',
    description: 'Update a seller level. Admins only.',
  })
  updateSellerLevel(
    @CurrentAdmin() adminId: string,
    @Args('id', { type: () => Int }) id: number,
    @Args('input') input: UpdateSellerLevelInput,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.accountService.updateSellerLevel({
      adminId,
      id,
      input,
      language,
    });
  }

  @Mutation(() => SellerLevel, {
    name: 'deleteSellerLevel',
    description:
      'Delete a seller level. Fails if it is still assigned to sellers. Admins only.',
  })
  deleteSellerLevel(
    @CurrentAdmin() adminId: string,
    @Args('id', { type: () => Int }) id: number,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.accountService.deleteSellerLevel({
      adminId,
      id,
      language,
    });
  }

  @Mutation(() => SellerLevelTranslation, {
    name: 'upsertSellerLevelTranslation',
    description: 'Create or update a seller level translation. Admins only.',
  })
  upsertSellerLevelTranslation(
    @CurrentAdmin() adminId: string,
    @Args('input') input: UpsertSellerLevelTranslationInput,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.accountService.upsertSellerLevelTranslation({
      adminId,
      input,
      language,
    });
  }

  @Mutation(() => SellerLevelTranslation, {
    name: 'deleteSellerLevelTranslation',
    description: 'Delete a seller level translation. Admins only.',
  })
  deleteSellerLevelTranslation(
    @CurrentAdmin() adminId: string,
    @Args('sellerLevelId', { type: () => Int }) sellerLevelId: number,
    @Args('translationLanguage', { type: () => Language })
    translationLanguage: Language,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.accountService.deleteSellerLevelTranslation({
      adminId,
      sellerLevelId,
      translationLanguage,
      language,
    });
  }
}
