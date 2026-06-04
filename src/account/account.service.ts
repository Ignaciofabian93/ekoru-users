import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  UnAuthorizedError,
  BadRequestError,
  NotFoundError,
  ConflictError,
  InternalServerError,
} from '../common/exceptions';
import { hash, genSalt, compare } from 'bcrypt';
import { Language } from '../graphql/enums';
import { accountMessages, AccountMessages } from './account.i18n';
import {
  CreateSellerLabelInput,
  UpdateSellerLabelInput,
  UpsertSellerLabelTranslationInput,
  CreateSellerLevelInput,
  UpdateSellerLevelInput,
  UpsertSellerLevelTranslationInput,
} from './dto';

@Injectable()
export class AccountService {
  private readonly logger = new Logger(AccountService.name);

  constructor(private readonly prisma: PrismaService) {}

  async deactivateAccount(sellerId: string, language: Language) {
    const t = accountMessages[language];
    try {
      if (!sellerId) {
        throw new UnAuthorizedError(t.unauthorized);
      }

      const seller = await this.prisma.seller.update({
        where: { id: sellerId },
        data: { isActive: false },
      });

      return seller;
    } catch (error) {
      if (error instanceof UnAuthorizedError) throw error;
      this.logger.error('Error deactivating account:', error);
      throw new InternalServerError(t.errorDeactivateAccount);
    }
  }

  async reactivateAccount(sellerId: string, language: Language) {
    const t = accountMessages[language];
    try {
      if (!sellerId) {
        throw new UnAuthorizedError(t.unauthorized);
      }

      const seller = await this.prisma.seller.update({
        where: { id: sellerId },
        data: { isActive: true },
      });

      return seller;
    } catch (error) {
      if (error instanceof UnAuthorizedError) throw error;
      this.logger.error('Error reactivating account:', error);
      throw new InternalServerError(t.errorReactivateAccount);
    }
  }

  async addPoints(
    sellerId: string,
    targetId: string,
    points: number,
    language: Language,
  ) {
    const t = accountMessages[language];
    try {
      if (!sellerId) {
        throw new UnAuthorizedError(t.unauthorized);
      }

      const seller = await this.prisma.seller.update({
        where: { id: targetId },
        data: { points: { increment: points } },
      });

      return seller;
    } catch (error) {
      if (error instanceof UnAuthorizedError) throw error;
      this.logger.error('Error adding points:', error);
      throw new InternalServerError(t.errorAddPoints);
    }
  }

  async deductPoints(
    sellerId: string,
    targetId: string,
    points: number,
    language: Language,
  ) {
    const t = accountMessages[language];
    try {
      if (!sellerId) {
        throw new UnAuthorizedError(t.unauthorized);
      }

      const seller = await this.prisma.seller.update({
        where: { id: targetId },
        data: { points: { decrement: points } },
      });

      return seller;
    } catch (error) {
      if (error instanceof UnAuthorizedError) throw error;
      this.logger.error('Error deducting points:', error);
      throw new InternalServerError(t.errorDeductPoints);
    }
  }

  async updateSellerCategory(
    sellerId: string,
    targetId: string,
    categoryId: number,
    language: Language,
  ) {
    const t = accountMessages[language];
    try {
      if (!sellerId) {
        throw new UnAuthorizedError(t.unauthorized);
      }

      const parsedCategoryId = Number(categoryId);
      const seller = await this.prisma.seller.update({
        where: { id: targetId },
        data: { sellerLevelId: parsedCategoryId },
      });

      return seller;
    } catch (error) {
      if (error instanceof UnAuthorizedError) throw error;
      this.logger.error('Error updating seller category:', error);
      throw new InternalServerError(t.errorUpdateSellerCategory);
    }
  }

  async updatePassword(
    sellerId: string,
    currentPassword: string,
    newPassword: string,
    language: Language,
  ) {
    const t = accountMessages[language];
    try {
      if (!sellerId) {
        throw new UnAuthorizedError(t.unauthorized);
      }

      const seller = await this.prisma.seller.findUnique({
        where: { id: sellerId },
      });

      if (!seller || !(await compare(currentPassword, seller.password))) {
        throw new BadRequestError(t.incorrectPassword);
      }

      const salt = await genSalt(12);
      const hashedNewPassword = await hash(newPassword, salt);

      await this.prisma.seller.update({
        where: { id: sellerId },
        data: { password: hashedNewPassword },
      });

      return seller;
    } catch (error) {
      if (
        error instanceof UnAuthorizedError ||
        error instanceof BadRequestError
      )
        throw error;
      this.logger.error('Error updating password:', error);
      throw new InternalServerError(t.errorUpdatePassword);
    }
  }

  requestPasswordReset(email: string) {
    // TODO: Implement password reset logic
    this.logger.debug(`requestPasswordReset for email: ${email}`);
    return true;
  }

  // ─── Seller Labels (admin) ──────────────────────────────────────────────────

  private assertAdmin(adminId: string, t: AccountMessages) {
    if (!adminId) {
      throw new UnAuthorizedError(t.unauthorized);
    }
  }

  async getSellerLabels(language: Language) {
    const t = accountMessages[language];
    try {
      return await this.prisma.sellerLabel.findMany({
        include: { translations: true },
        orderBy: { transactionsRequired: 'asc' },
      });
    } catch (error) {
      this.logger.error('Error fetching seller labels:', error);
      throw new InternalServerError(t.errorGetLabels);
    }
  }

  async getSellerLabelById(id: number, language: Language) {
    const t = accountMessages[language];
    try {
      const label = await this.prisma.sellerLabel.findUnique({
        where: { id },
        include: { translations: true },
      });
      if (!label) throw new NotFoundError(t.labelNotFound);
      return label;
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      this.logger.error('Error fetching seller label:', error);
      throw new InternalServerError(t.errorGetLabel);
    }
  }

  async createSellerLabel(
    adminId: string,
    input: CreateSellerLabelInput,
    language: Language,
  ) {
    const t = accountMessages[language];
    try {
      this.assertAdmin(adminId, t);

      const existing = await this.prisma.sellerLabel.findUnique({
        where: { labelName: input.labelName },
        select: { id: true },
      });
      if (existing) throw new BadRequestError(t.labelNameExists);

      return await this.prisma.sellerLabel.create({
        data: {
          labelName: input.labelName,
          transactionKind: input.transactionKind,
          transactionsRequired: input.transactionsRequired,
          description: input.description,
          badgeIcon: input.badgeIcon,
        },
        include: { translations: true },
      });
    } catch (error) {
      if (
        error instanceof UnAuthorizedError ||
        error instanceof BadRequestError
      ) {
        throw error;
      }
      this.logger.error('Error creating seller label:', error);
      throw new InternalServerError(t.errorCreateLabel);
    }
  }

  async updateSellerLabel(
    adminId: string,
    id: number,
    input: UpdateSellerLabelInput,
    language: Language,
  ) {
    const t = accountMessages[language];
    try {
      this.assertAdmin(adminId, t);

      const existing = await this.prisma.sellerLabel.findUnique({
        where: { id },
      });
      if (!existing) throw new NotFoundError(t.labelNotFound);

      if (input.labelName && input.labelName !== existing.labelName) {
        const nameTaken = await this.prisma.sellerLabel.findUnique({
          where: { labelName: input.labelName },
          select: { id: true },
        });
        if (nameTaken) throw new BadRequestError(t.labelNameExists);
      }

      return await this.prisma.sellerLabel.update({
        where: { id },
        data: {
          ...(input.labelName !== undefined && { labelName: input.labelName }),
          ...(input.transactionKind !== undefined && {
            transactionKind: input.transactionKind,
          }),
          ...(input.transactionsRequired !== undefined && {
            transactionsRequired: input.transactionsRequired,
          }),
          ...(input.description !== undefined && {
            description: input.description,
          }),
          ...(input.badgeIcon !== undefined && { badgeIcon: input.badgeIcon }),
        },
        include: { translations: true },
      });
    } catch (error) {
      if (
        error instanceof UnAuthorizedError ||
        error instanceof NotFoundError ||
        error instanceof BadRequestError
      ) {
        throw error;
      }
      this.logger.error('Error updating seller label:', error);
      throw new InternalServerError(t.errorUpdateLabel);
    }
  }

  /**
   * Guarded hard delete: refuses to delete a label that sellers have already
   * earned (would wipe their achievement history). Translations cascade.
   */
  async deleteSellerLabel(adminId: string, id: number, language: Language) {
    const t = accountMessages[language];
    try {
      this.assertAdmin(adminId, t);

      const existing = await this.prisma.sellerLabel.findUnique({
        where: { id },
        include: { translations: true },
      });
      if (!existing) throw new NotFoundError(t.labelNotFound);

      const achievedCount = await this.prisma.sellerAchievedLabel.count({
        where: { labelId: id },
      });
      if (achievedCount > 0) throw new ConflictError(t.labelInUse);

      await this.prisma.sellerLabel.delete({ where: { id } });
      return existing;
    } catch (error) {
      if (
        error instanceof UnAuthorizedError ||
        error instanceof NotFoundError ||
        error instanceof ConflictError
      ) {
        throw error;
      }
      this.logger.error('Error deleting seller label:', error);
      throw new InternalServerError(t.errorDeleteLabel);
    }
  }

  async upsertSellerLabelTranslation(
    adminId: string,
    input: UpsertSellerLabelTranslationInput,
    language: Language,
  ) {
    const t = accountMessages[language];
    try {
      this.assertAdmin(adminId, t);

      const label = await this.prisma.sellerLabel.findUnique({
        where: { id: input.sellerLabelId },
        select: { id: true },
      });
      if (!label) throw new NotFoundError(t.labelNotFound);

      return await this.prisma.sellerLabelTranslation.upsert({
        where: {
          sellerLabelId_language: {
            sellerLabelId: input.sellerLabelId,
            language: input.language,
          },
        },
        update: { labelName: input.labelName, description: input.description },
        create: {
          sellerLabelId: input.sellerLabelId,
          language: input.language,
          labelName: input.labelName,
          description: input.description,
        },
      });
    } catch (error) {
      if (
        error instanceof UnAuthorizedError ||
        error instanceof NotFoundError
      ) {
        throw error;
      }
      this.logger.error('Error saving seller label translation:', error);
      throw new InternalServerError(t.errorUpsertLabelTranslation);
    }
  }

  async deleteSellerLabelTranslation(
    adminId: string,
    sellerLabelId: number,
    translationLanguage: Language,
    language: Language,
  ) {
    const t = accountMessages[language];
    try {
      this.assertAdmin(adminId, t);

      const existing = await this.prisma.sellerLabelTranslation.findUnique({
        where: {
          sellerLabelId_language: {
            sellerLabelId,
            language: translationLanguage,
          },
        },
      });
      if (!existing) throw new NotFoundError(t.labelTranslationNotFound);

      return await this.prisma.sellerLabelTranslation.delete({
        where: {
          sellerLabelId_language: {
            sellerLabelId,
            language: translationLanguage,
          },
        },
      });
    } catch (error) {
      if (
        error instanceof UnAuthorizedError ||
        error instanceof NotFoundError
      ) {
        throw error;
      }
      this.logger.error('Error deleting seller label translation:', error);
      throw new InternalServerError(t.errorDeleteLabelTranslation);
    }
  }

  // ─── Seller Levels (admin) ──────────────────────────────────────────────────

  async getSellerLevels(language: Language) {
    const t = accountMessages[language];
    try {
      return await this.prisma.sellerLevel.findMany({
        include: { translations: true },
        orderBy: { minPoints: 'asc' },
      });
    } catch (error) {
      this.logger.error('Error fetching seller levels:', error);
      throw new InternalServerError(t.errorGetLevels);
    }
  }

  async getSellerLevelById(id: number, language: Language) {
    const t = accountMessages[language];
    try {
      const level = await this.prisma.sellerLevel.findUnique({
        where: { id },
        include: { translations: true },
      });
      if (!level) throw new NotFoundError(t.levelNotFound);
      return level;
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      this.logger.error('Error fetching seller level:', error);
      throw new InternalServerError(t.errorGetLevel);
    }
  }

  async createSellerLevel(
    adminId: string,
    input: CreateSellerLevelInput,
    language: Language,
  ) {
    const t = accountMessages[language];
    try {
      this.assertAdmin(adminId, t);

      const nameTaken = await this.prisma.sellerLevel.findUnique({
        where: { levelName: input.levelName },
        select: { id: true },
      });
      if (nameTaken) throw new BadRequestError(t.levelNameExists);

      const pointsTaken = await this.prisma.sellerLevel.findUnique({
        where: { minPoints: input.minPoints },
        select: { id: true },
      });
      if (pointsTaken) throw new BadRequestError(t.levelPointsExists);

      return await this.prisma.sellerLevel.create({
        data: {
          levelName: input.levelName,
          minPoints: input.minPoints,
          maxPoints: input.maxPoints,
          benefits: input.benefits ?? undefined,
          badgeIcon: input.badgeIcon,
        },
        include: { translations: true },
      });
    } catch (error) {
      if (
        error instanceof UnAuthorizedError ||
        error instanceof BadRequestError
      ) {
        throw error;
      }
      this.logger.error('Error creating seller level:', error);
      throw new InternalServerError(t.errorCreateLevel);
    }
  }

  async updateSellerLevel(
    adminId: string,
    id: number,
    input: UpdateSellerLevelInput,
    language: Language,
  ) {
    const t = accountMessages[language];
    try {
      this.assertAdmin(adminId, t);

      const existing = await this.prisma.sellerLevel.findUnique({
        where: { id },
      });
      if (!existing) throw new NotFoundError(t.levelNotFound);

      if (input.levelName && input.levelName !== existing.levelName) {
        const nameTaken = await this.prisma.sellerLevel.findUnique({
          where: { levelName: input.levelName },
          select: { id: true },
        });
        if (nameTaken) throw new BadRequestError(t.levelNameExists);
      }

      if (
        input.minPoints !== undefined &&
        input.minPoints !== existing.minPoints
      ) {
        const pointsTaken = await this.prisma.sellerLevel.findUnique({
          where: { minPoints: input.minPoints },
          select: { id: true },
        });
        if (pointsTaken) throw new BadRequestError(t.levelPointsExists);
      }

      return await this.prisma.sellerLevel.update({
        where: { id },
        data: {
          ...(input.levelName !== undefined && { levelName: input.levelName }),
          ...(input.minPoints !== undefined && { minPoints: input.minPoints }),
          ...(input.maxPoints !== undefined && { maxPoints: input.maxPoints }),
          ...(input.benefits !== undefined && { benefits: input.benefits }),
          ...(input.badgeIcon !== undefined && { badgeIcon: input.badgeIcon }),
        },
        include: { translations: true },
      });
    } catch (error) {
      if (
        error instanceof UnAuthorizedError ||
        error instanceof NotFoundError ||
        error instanceof BadRequestError
      ) {
        throw error;
      }
      this.logger.error('Error updating seller level:', error);
      throw new InternalServerError(t.errorUpdateLevel);
    }
  }

  /**
   * Guarded hard delete: refuses to delete a level still assigned to sellers.
   * Translations cascade.
   */
  async deleteSellerLevel(adminId: string, id: number, language: Language) {
    const t = accountMessages[language];
    try {
      this.assertAdmin(adminId, t);

      const existing = await this.prisma.sellerLevel.findUnique({
        where: { id },
        include: { translations: true },
      });
      if (!existing) throw new NotFoundError(t.levelNotFound);

      const sellerCount = await this.prisma.seller.count({
        where: { sellerLevelId: id },
      });
      if (sellerCount > 0) throw new ConflictError(t.levelInUse);

      await this.prisma.sellerLevel.delete({ where: { id } });
      return existing;
    } catch (error) {
      if (
        error instanceof UnAuthorizedError ||
        error instanceof NotFoundError ||
        error instanceof ConflictError
      ) {
        throw error;
      }
      this.logger.error('Error deleting seller level:', error);
      throw new InternalServerError(t.errorDeleteLevel);
    }
  }

  async upsertSellerLevelTranslation(
    adminId: string,
    input: UpsertSellerLevelTranslationInput,
    language: Language,
  ) {
    const t = accountMessages[language];
    try {
      this.assertAdmin(adminId, t);

      const level = await this.prisma.sellerLevel.findUnique({
        where: { id: input.sellerLevelId },
        select: { id: true },
      });
      if (!level) throw new NotFoundError(t.levelNotFound);

      return await this.prisma.sellerLevelTranslation.upsert({
        where: {
          sellerLevelId_language: {
            sellerLevelId: input.sellerLevelId,
            language: input.language,
          },
        },
        update: { levelName: input.levelName },
        create: {
          sellerLevelId: input.sellerLevelId,
          language: input.language,
          levelName: input.levelName,
        },
      });
    } catch (error) {
      if (
        error instanceof UnAuthorizedError ||
        error instanceof NotFoundError
      ) {
        throw error;
      }
      this.logger.error('Error saving seller level translation:', error);
      throw new InternalServerError(t.errorUpsertLevelTranslation);
    }
  }

  async deleteSellerLevelTranslation(
    adminId: string,
    sellerLevelId: number,
    translationLanguage: Language,
    language: Language,
  ) {
    const t = accountMessages[language];
    try {
      this.assertAdmin(adminId, t);

      const existing = await this.prisma.sellerLevelTranslation.findUnique({
        where: {
          sellerLevelId_language: {
            sellerLevelId,
            language: translationLanguage,
          },
        },
      });
      if (!existing) throw new NotFoundError(t.levelTranslationNotFound);

      return await this.prisma.sellerLevelTranslation.delete({
        where: {
          sellerLevelId_language: {
            sellerLevelId,
            language: translationLanguage,
          },
        },
      });
    } catch (error) {
      if (
        error instanceof UnAuthorizedError ||
        error instanceof NotFoundError
      ) {
        throw error;
      }
      this.logger.error('Error deleting seller level translation:', error);
      throw new InternalServerError(t.errorDeleteLevelTranslation);
    }
  }
}
