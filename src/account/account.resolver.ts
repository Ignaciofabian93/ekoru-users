import { Resolver, Query, Mutation, Args, Int, Context } from '@nestjs/graphql';
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
    return this.accountService.getSellerLabelById(id, language);
  }

  @Mutation(() => SellerLabel, {
    name: 'createSellerLabel',
    description: 'Create a seller label. Admins only.',
  })
  createSellerLabel(
    @Context() ctx: { adminId?: string },
    @Args('input') input: CreateSellerLabelInput,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.accountService.createSellerLabel(
      ctx.adminId ?? '',
      input,
      language,
    );
  }

  @Mutation(() => SellerLabel, {
    name: 'updateSellerLabel',
    description: 'Update a seller label. Admins only.',
  })
  updateSellerLabel(
    @Context() ctx: { adminId?: string },
    @Args('id', { type: () => Int }) id: number,
    @Args('input') input: UpdateSellerLabelInput,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.accountService.updateSellerLabel(
      ctx.adminId ?? '',
      id,
      input,
      language,
    );
  }

  @Mutation(() => SellerLabel, {
    name: 'deleteSellerLabel',
    description:
      'Delete a seller label. Fails if sellers have already earned it. Admins only.',
  })
  deleteSellerLabel(
    @Context() ctx: { adminId?: string },
    @Args('id', { type: () => Int }) id: number,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.accountService.deleteSellerLabel(
      ctx.adminId ?? '',
      id,
      language,
    );
  }

  @Mutation(() => SellerLabelTranslation, {
    name: 'upsertSellerLabelTranslation',
    description: 'Create or update a seller label translation. Admins only.',
  })
  upsertSellerLabelTranslation(
    @Context() ctx: { adminId?: string },
    @Args('input') input: UpsertSellerLabelTranslationInput,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.accountService.upsertSellerLabelTranslation(
      ctx.adminId ?? '',
      input,
      language,
    );
  }

  @Mutation(() => SellerLabelTranslation, {
    name: 'deleteSellerLabelTranslation',
    description: 'Delete a seller label translation. Admins only.',
  })
  deleteSellerLabelTranslation(
    @Context() ctx: { adminId?: string },
    @Args('sellerLabelId', { type: () => Int }) sellerLabelId: number,
    @Args('translationLanguage', { type: () => Language })
    translationLanguage: Language,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.accountService.deleteSellerLabelTranslation(
      ctx.adminId ?? '',
      sellerLabelId,
      translationLanguage,
      language,
    );
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
    return this.accountService.getSellerLevelById(id, language);
  }

  @Mutation(() => SellerLevel, {
    name: 'createSellerLevel',
    description: 'Create a seller level. Admins only.',
  })
  createSellerLevel(
    @Context() ctx: { adminId?: string },
    @Args('input') input: CreateSellerLevelInput,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.accountService.createSellerLevel(
      ctx.adminId ?? '',
      input,
      language,
    );
  }

  @Mutation(() => SellerLevel, {
    name: 'updateSellerLevel',
    description: 'Update a seller level. Admins only.',
  })
  updateSellerLevel(
    @Context() ctx: { adminId?: string },
    @Args('id', { type: () => Int }) id: number,
    @Args('input') input: UpdateSellerLevelInput,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.accountService.updateSellerLevel(
      ctx.adminId ?? '',
      id,
      input,
      language,
    );
  }

  @Mutation(() => SellerLevel, {
    name: 'deleteSellerLevel',
    description:
      'Delete a seller level. Fails if it is still assigned to sellers. Admins only.',
  })
  deleteSellerLevel(
    @Context() ctx: { adminId?: string },
    @Args('id', { type: () => Int }) id: number,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.accountService.deleteSellerLevel(
      ctx.adminId ?? '',
      id,
      language,
    );
  }

  @Mutation(() => SellerLevelTranslation, {
    name: 'upsertSellerLevelTranslation',
    description: 'Create or update a seller level translation. Admins only.',
  })
  upsertSellerLevelTranslation(
    @Context() ctx: { adminId?: string },
    @Args('input') input: UpsertSellerLevelTranslationInput,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.accountService.upsertSellerLevelTranslation(
      ctx.adminId ?? '',
      input,
      language,
    );
  }

  @Mutation(() => SellerLevelTranslation, {
    name: 'deleteSellerLevelTranslation',
    description: 'Delete a seller level translation. Admins only.',
  })
  deleteSellerLevelTranslation(
    @Context() ctx: { adminId?: string },
    @Args('sellerLevelId', { type: () => Int }) sellerLevelId: number,
    @Args('translationLanguage', { type: () => Language })
    translationLanguage: Language,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.accountService.deleteSellerLevelTranslation(
      ctx.adminId ?? '',
      sellerLevelId,
      translationLanguage,
      language,
    );
  }
}
