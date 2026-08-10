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
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { SellersService } from '../sellers/sellers.service';
import { NotificationRenderer } from '../notifications/notification-renderer';
import {
  pickDefined,
  requireBulkFields,
  processBulkRows,
  bulkErrorMessage,
} from '../common/bulk';
import { Language } from '../graphql/enums';
import { accountMessages, AccountMessages } from './account.i18n';
import {
  CreateSellerLabelInput,
  UpdateSellerLabelInput,
  UpsertSellerLabelTranslationInput,
  CreateSellerLevelInput,
  UpdateSellerLevelInput,
  UpsertSellerLevelTranslationInput,
  SellerLabelUpsertRowInput,
  SellerLabelTranslationUpsertRowInput,
  SellerLevelUpsertRowInput,
  SellerLevelTranslationUpsertRowInput,
  PointsByTransactionKindUpsertRowInput,
  NotificationTemplateUpsertRowInput,
  NotificationTemplateTranslationUpsertRowInput,
} from './dto';

@Injectable()
export class AccountService {
  private readonly logger = new Logger(AccountService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sellersService: SellersService,
    private readonly notificationRenderer: NotificationRenderer,
  ) {}

  /**
   * Drops the in-process notification-copy cache after an admin changes a
   * template. Without it an edit takes up to `CACHE_TTL_MS` to show up.
   *
   * Caveat worth knowing if users is ever scaled past one replica: the cache is
   * per-process, so only the container that served the mutation clears
   * immediately — the others still expire on their own TTL.
   */
  private invalidateNotificationCopy(): void {
    this.notificationRenderer.invalidate();
  }

  async deactivateAccount({
    sellerId,
    language,
  }: {
    sellerId: string;
    language: Language;
  }) {
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

  async reactivateAccount({
    sellerId,
    language,
  }: {
    sellerId: string;
    language: Language;
  }) {
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

  /**
   * Permanently retires the current seller's account (self-service delete).
   *
   * A true row delete is not possible here: the commerce/history tables
   * (Order, Payment, Transaction, Quotation, ServiceBooking, Chat, Message…)
   * reference the seller with the default `onDelete: Restrict`, so deleting the
   * row would fail whenever any history exists — and cascading it would wipe the
   * counterparties' records. So we do the right thing for a system with
   * transaction history: an irreversible anonymise-and-lock.
   *
   *   1. Refuse while the seller still has open obligations — deleting mid-deal
   *      would strand the counterparty (the same gate an admin ban uses).
   *   2. Retire every live listing (marketplace + store) so nothing stays for
   *      sale under a dead account. Those tables belong to other subgraphs but
   *      share this database, so they're reached with raw SQL.
   *   3. Strip personal data from the seller and both profiles, and drop saved
   *      addresses + preferences.
   *   4. Lock sign-in: randomised password and an anonymised, unique e-mail.
   *
   * The seller row survives (past orders/payments stay valid) but the person and
   * their data are gone and the account can never be used again. Runs atomically
   * (Serializable) so nothing new can slip in between the check and the wipe.
   */
  async deleteAccount({
    sellerId,
    language,
  }: {
    sellerId: string;
    language: Language;
  }): Promise<boolean> {
    const t = accountMessages[language];
    try {
      if (!sellerId) {
        throw new UnAuthorizedError(t.unauthorized);
      }

      await this.prisma.$transaction(
        async (tx) => {
          const seller = await tx.seller.findUnique({
            where: { id: sellerId },
            select: { id: true },
          });
          if (!seller) {
            throw new NotFoundError(t.sellerNotFound);
          }

          const { total } = await this.sellersService.getPendingObligations({
            client: tx,
            sellerId,
          });
          if (total > 0) {
            throw new BadRequestError(t.accountHasPendingObligations);
          }

          // Retire live listings so nothing stays for sale under a dead account.
          // Product/StoreProduct live in other subgraphs' schemas but the same
          // database, so they're updated with raw SQL (like the obligations
          // check above).
          await tx.$executeRaw`
            UPDATE "Product"
               SET "deletedAt" = NOW(), "isActive" = false
             WHERE "sellerId" = ${sellerId} AND "deletedAt" IS NULL`;
          await tx.$executeRaw`
            UPDATE "StoreProduct"
               SET "deletedAt" = NOW(), "isActive" = false
             WHERE "sellerId" = ${sellerId} AND "deletedAt" IS NULL`;

          // Purge sensitive data the seller owns in other subgraphs — payout/bank
          // config and professional credentials — which a true row delete would
          // have cascaded away. Raw SQL again, since this client doesn't model
          // them.
          await tx.$executeRaw`
            DELETE FROM "ChileanPaymentConfig" WHERE "sellerId" = ${sellerId}`;
          await tx.$executeRaw`
            DELETE FROM "ServiceProviderCredentials" WHERE "sellerId" = ${sellerId}`;

          // Drop stored personal data we fully own.
          await tx.businessAddress.deleteMany({
            where: { businessProfile: { sellerId } },
          });
          await tx.sellerPreferences.deleteMany({ where: { sellerId } });

          // Anonymise whichever profile exists (updateMany hits 0 or 1 row).
          await tx.personProfile.updateMany({
            where: { sellerId },
            data: {
              firstName: t.deletedAccountName,
              lastName: null,
              displayName: null,
              bio: null,
              birthday: null,
              profileImage: null,
              coverImage: null,
            },
          });
          await tx.businessProfile.updateMany({
            where: { sellerId },
            data: {
              businessName: t.deletedAccountName,
              description: null,
              logo: null,
              coverImage: null,
              legalBusinessName: null,
              taxId: null,
              legalRepresentative: null,
              legalRepresentativeTaxId: null,
              businessHours: Prisma.DbNull,
            },
          });

          // Anonymise + lock the account itself.
          const lockedPassword = await hash(randomUUID(), await genSalt(12));
          await tx.seller.update({
            where: { id: sellerId },
            data: {
              email: `deleted+${sellerId}@deleted.ekoru`,
              password: lockedPassword,
              isActive: false,
              isVerified: false,
              address: null,
              phone: null,
              website: null,
              cityId: null,
              countryId: null,
              countyId: null,
              regionId: null,
              socialMediaLinks: Prisma.DbNull,
            },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );

      return true;
    } catch (error) {
      if (
        error instanceof UnAuthorizedError ||
        error instanceof BadRequestError ||
        error instanceof NotFoundError
      ) {
        throw error;
      }
      this.logger.error('Error deleting account:', error);
      throw new InternalServerError(t.errorDeleteAccount);
    }
  }

  async addPoints({
    adminId,
    targetId,
    points,
    language,
  }: {
    adminId: string;
    targetId: string;
    points: number;
    language: Language;
  }) {
    const t = accountMessages[language];
    try {
      if (!adminId) {
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

  async deductPoints({
    adminId,
    targetId,
    points,
    language,
  }: {
    adminId: string;
    targetId: string;
    points: number;
    language: Language;
  }) {
    const t = accountMessages[language];
    try {
      if (!adminId) {
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

  async updateSellerCategory({
    adminId,
    targetId,
    categoryId,
    language,
  }: {
    adminId: string;
    targetId: string;
    categoryId: number;
    language: Language;
  }) {
    const t = accountMessages[language];
    try {
      if (!adminId) {
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

  async updatePassword({
    sellerId,
    currentPassword,
    newPassword,
    language,
  }: {
    sellerId: string;
    currentPassword: string;
    newPassword: string;
    language: Language;
  }) {
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

  private assertAdmin({ adminId, t }: { adminId: string; t: AccountMessages }) {
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

  async getSellerLabelById({
    id,
    language,
  }: {
    id: number;
    language: Language;
  }) {
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

  async createSellerLabel({
    adminId,
    input,
    language,
  }: {
    adminId: string;
    input: CreateSellerLabelInput;
    language: Language;
  }) {
    const t = accountMessages[language];
    try {
      this.assertAdmin({ adminId, t });

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

  async updateSellerLabel({
    adminId,
    id,
    input,
    language,
  }: {
    adminId: string;
    id: number;
    input: UpdateSellerLabelInput;
    language: Language;
  }) {
    const t = accountMessages[language];
    try {
      this.assertAdmin({ adminId, t });

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
  async deleteSellerLabel({
    adminId,
    id,
    language,
  }: {
    adminId: string;
    id: number;
    language: Language;
  }) {
    const t = accountMessages[language];
    try {
      this.assertAdmin({ adminId, t });

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

  async upsertSellerLabelTranslation({
    adminId,
    input,
    language,
  }: {
    adminId: string;
    input: UpsertSellerLabelTranslationInput;
    language: Language;
  }) {
    const t = accountMessages[language];
    try {
      this.assertAdmin({ adminId, t });

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

  async deleteSellerLabelTranslation({
    adminId,
    sellerLabelId,
    translationLanguage,
    language,
  }: {
    adminId: string;
    sellerLabelId: number;
    translationLanguage: Language;
    language: Language;
  }) {
    const t = accountMessages[language];
    try {
      this.assertAdmin({ adminId, t });

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

  async getSellerLevelById({
    id,
    language,
  }: {
    id: number;
    language: Language;
  }) {
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

  async createSellerLevel({
    adminId,
    input,
    language,
  }: {
    adminId: string;
    input: CreateSellerLevelInput;
    language: Language;
  }) {
    const t = accountMessages[language];
    try {
      this.assertAdmin({ adminId, t });

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

  async updateSellerLevel({
    adminId,
    id,
    input,
    language,
  }: {
    adminId: string;
    id: number;
    input: UpdateSellerLevelInput;
    language: Language;
  }) {
    const t = accountMessages[language];
    try {
      this.assertAdmin({ adminId, t });

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
  async deleteSellerLevel({
    adminId,
    id,
    language,
  }: {
    adminId: string;
    id: number;
    language: Language;
  }) {
    const t = accountMessages[language];
    try {
      this.assertAdmin({ adminId, t });

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

  async upsertSellerLevelTranslation({
    adminId,
    input,
    language,
  }: {
    adminId: string;
    input: UpsertSellerLevelTranslationInput;
    language: Language;
  }) {
    const t = accountMessages[language];
    try {
      this.assertAdmin({ adminId, t });

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

  async deleteSellerLevelTranslation({
    adminId,
    sellerLevelId,
    translationLanguage,
    language,
  }: {
    adminId: string;
    sellerLevelId: number;
    translationLanguage: Language;
    language: Language;
  }) {
    const t = accountMessages[language];
    try {
      this.assertAdmin({ adminId, t });

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

  // ─── Bulk upserts (admin panel XLSX import / row edits) ─────────────────────
  //
  // Rows with an `id` update; rows without an `id` create (translations without
  // an id are matched by their parent+language unique key first). Rows are
  // processed independently so one bad spreadsheet line never aborts the batch.

  async bulkUpsertSellerLabels({
    adminId,
    rows,
    language,
  }: {
    adminId: string;
    rows: SellerLabelUpsertRowInput[];
    language: Language;
  }) {
    this.assertAdmin({ adminId, t: accountMessages[language] });

    return processBulkRows(this.logger, rows, async (row) => {
      const data = pickDefined({
        labelName: row.labelName,
        transactionKind: row.transactionKind,
        transactionsRequired: row.transactionsRequired,
        description: row.description,
        badgeIcon: row.badgeIcon,
      });

      if (row.id != null) {
        await this.prisma.sellerLabel.update({ where: { id: row.id }, data });
        return { outcome: 'updated', id: row.id };
      }

      requireBulkFields(row, [
        'labelName',
        'transactionKind',
        'transactionsRequired',
      ]);
      const created = await this.prisma.sellerLabel.create({
        data: {
          labelName: row.labelName!,
          transactionKind: row.transactionKind!,
          transactionsRequired: row.transactionsRequired!,
          description: row.description,
          badgeIcon: row.badgeIcon,
        },
      });
      return { outcome: 'created', id: created.id };
    });
  }

  async bulkUpsertSellerLabelTranslations({
    adminId,
    rows,
    language,
  }: {
    adminId: string;
    rows: SellerLabelTranslationUpsertRowInput[];
    language: Language;
  }) {
    this.assertAdmin({ adminId, t: accountMessages[language] });

    return processBulkRows(this.logger, rows, async (row) => {
      const data = pickDefined({
        labelName: row.labelName,
        description: row.description,
      });

      if (row.id != null) {
        await this.prisma.sellerLabelTranslation.update({
          where: { id: row.id },
          data,
        });
        return { outcome: 'updated', id: row.id };
      }

      const { sellerLabelId, language: rowLanguage } = row;
      if (sellerLabelId == null || !rowLanguage) {
        throw new Error(
          'sellerLabelId and language are required when no id is provided',
        );
      }

      const existing = await this.prisma.sellerLabelTranslation.findUnique({
        where: {
          sellerLabelId_language: { sellerLabelId, language: rowLanguage },
        },
        select: { id: true },
      });

      if (existing) {
        await this.prisma.sellerLabelTranslation.update({
          where: { id: existing.id },
          data,
        });
        return { outcome: 'updated', id: existing.id };
      }

      requireBulkFields(row, ['labelName']);
      const created = await this.prisma.sellerLabelTranslation.create({
        data: {
          sellerLabelId,
          language: rowLanguage,
          labelName: row.labelName!,
          description: row.description,
        },
      });
      return { outcome: 'created', id: created.id };
    });
  }

  async bulkUpsertSellerLevels({
    adminId,
    rows,
    language,
  }: {
    adminId: string;
    rows: SellerLevelUpsertRowInput[];
    language: Language;
  }) {
    this.assertAdmin({ adminId, t: accountMessages[language] });

    return processBulkRows(this.logger, rows, async (row) => {
      const data = pickDefined({
        levelName: row.levelName,
        minPoints: row.minPoints,
        maxPoints: row.maxPoints,
        badgeIcon: row.badgeIcon,
        // `benefits` is JSON text on the wire; parse only when provided.
        benefits: this.parseBenefits(row.benefits),
      });

      if (row.id != null) {
        await this.prisma.sellerLevel.update({ where: { id: row.id }, data });
        return { outcome: 'updated', id: row.id };
      }

      requireBulkFields(row, ['levelName', 'minPoints']);
      const created = await this.prisma.sellerLevel.create({
        data: {
          levelName: row.levelName!,
          minPoints: row.minPoints!,
          maxPoints: row.maxPoints,
          badgeIcon: row.badgeIcon,
          benefits: this.parseBenefits(row.benefits),
        },
      });
      return { outcome: 'created', id: created.id };
    });
  }

  async bulkUpsertSellerLevelTranslations({
    adminId,
    rows,
    language,
  }: {
    adminId: string;
    rows: SellerLevelTranslationUpsertRowInput[];
    language: Language;
  }) {
    this.assertAdmin({ adminId, t: accountMessages[language] });

    return processBulkRows(this.logger, rows, async (row) => {
      const data = pickDefined({ levelName: row.levelName });

      if (row.id != null) {
        await this.prisma.sellerLevelTranslation.update({
          where: { id: row.id },
          data,
        });
        return { outcome: 'updated', id: row.id };
      }

      const { sellerLevelId, language: rowLanguage } = row;
      if (sellerLevelId == null || !rowLanguage) {
        throw new Error(
          'sellerLevelId and language are required when no id is provided',
        );
      }

      const existing = await this.prisma.sellerLevelTranslation.findUnique({
        where: {
          sellerLevelId_language: { sellerLevelId, language: rowLanguage },
        },
        select: { id: true },
      });

      if (existing) {
        await this.prisma.sellerLevelTranslation.update({
          where: { id: existing.id },
          data,
        });
        return { outcome: 'updated', id: existing.id };
      }

      requireBulkFields(row, ['levelName']);
      const created = await this.prisma.sellerLevelTranslation.create({
        data: {
          sellerLevelId,
          language: rowLanguage,
          levelName: row.levelName!,
        },
      });
      return { outcome: 'created', id: created.id };
    });
  }

  // ─── Points by transaction kind (admin) ─────────────────────────────────────

  async getPointsByTransactionKinds() {
    try {
      return await this.prisma.pointsByTransactionKind.findMany({
        orderBy: { transactionKind: 'asc' },
      });
    } catch (error) {
      this.logger.error('Error fetching points by transaction kind:', error);
      throw new InternalServerError(bulkErrorMessage(error));
    }
  }

  getPointsByTransactionKindById({ id }: { id: number }) {
    return this.prisma.pointsByTransactionKind.findUnique({ where: { id } });
  }

  async deletePointsByTransactionKind({
    adminId,
    id,
    language,
  }: {
    adminId: string;
    id: number;
    language: Language;
  }) {
    const t = accountMessages[language];
    this.assertAdmin({ adminId, t });
    try {
      return await this.prisma.pointsByTransactionKind.delete({
        where: { id },
      });
    } catch (error) {
      this.logger.error('Error deleting points by transaction kind:', error);
      throw new InternalServerError(bulkErrorMessage(error));
    }
  }

  async bulkUpsertPointsByTransactionKind({
    adminId,
    rows,
    language,
  }: {
    adminId: string;
    rows: PointsByTransactionKindUpsertRowInput[];
    language: Language;
  }) {
    this.assertAdmin({ adminId, t: accountMessages[language] });

    return processBulkRows(this.logger, rows, async (row) => {
      const data = pickDefined({
        transactionKind: row.transactionKind,
        pointsAwarded: row.pointsAwarded,
        description: row.description,
      });

      if (row.id != null) {
        await this.prisma.pointsByTransactionKind.update({
          where: { id: row.id },
          data,
        });
        return { outcome: 'updated', id: row.id };
      }

      // No id: `transactionKind` is unique, so match on it to update in place.
      if (row.transactionKind != null) {
        const existing = await this.prisma.pointsByTransactionKind.findUnique({
          where: { transactionKind: row.transactionKind },
          select: { id: true },
        });
        if (existing) {
          await this.prisma.pointsByTransactionKind.update({
            where: { id: existing.id },
            data,
          });
          return { outcome: 'updated', id: existing.id };
        }
      }

      requireBulkFields(row, ['transactionKind', 'pointsAwarded']);
      const created = await this.prisma.pointsByTransactionKind.create({
        data: {
          transactionKind: row.transactionKind!,
          pointsAwarded: row.pointsAwarded!,
          description: row.description,
        },
      });
      return { outcome: 'created', id: created.id };
    });
  }

  // ─── Notification templates (admin) ─────────────────────────────────────────

  async getNotificationTemplates() {
    try {
      return await this.prisma.notificationTemplate.findMany({
        include: { translations: true },
        orderBy: { type: 'asc' },
      });
    } catch (error) {
      this.logger.error('Error fetching notification templates:', error);
      throw new InternalServerError(bulkErrorMessage(error));
    }
  }

  getNotificationTemplateById({ id }: { id: number }) {
    return this.prisma.notificationTemplate.findUnique({
      where: { id },
      include: { translations: true },
    });
  }

  async deleteNotificationTemplate({
    adminId,
    id,
    language,
  }: {
    adminId: string;
    id: number;
    language: Language;
  }) {
    this.assertAdmin({ adminId, t: accountMessages[language] });
    try {
      const deleted = await this.prisma.notificationTemplate.delete({
        where: { id },
      });
      this.invalidateNotificationCopy();
      return deleted;
    } catch (error) {
      this.logger.error('Error deleting notification template:', error);
      throw new InternalServerError(bulkErrorMessage(error));
    }
  }

  async deleteNotificationTemplateTranslation({
    adminId,
    notificationTemplateId,
    translationLanguage,
    language,
  }: {
    adminId: string;
    notificationTemplateId: number;
    translationLanguage: Language;
    language: Language;
  }) {
    this.assertAdmin({ adminId, t: accountMessages[language] });
    try {
      const deleted = await this.prisma.notificationTemplateTranslation.delete({
        where: {
          notificationTemplateId_language: {
            notificationTemplateId,
            language: translationLanguage,
          },
        },
      });
      this.invalidateNotificationCopy();
      return deleted;
    } catch (error) {
      this.logger.error(
        'Error deleting notification template translation:',
        error,
      );
      throw new InternalServerError(bulkErrorMessage(error));
    }
  }

  async bulkUpsertNotificationTemplates({
    adminId,
    rows,
    language,
  }: {
    adminId: string;
    rows: NotificationTemplateUpsertRowInput[];
    language: Language;
  }) {
    this.assertAdmin({ adminId, t: accountMessages[language] });

    // A partially-failed batch still changed some rows, so the cache is dropped
    // regardless of the per-row outcomes.
    try {
      return await processBulkRows(this.logger, rows, async (row) => {
        const data = pickDefined({
          type: row.type,
          title: row.title,
          message: row.message,
          isActive: row.isActive,
        });

        if (row.id != null) {
          await this.prisma.notificationTemplate.update({
            where: { id: row.id },
            data,
          });
          return { outcome: 'updated', id: row.id };
        }

        // No id: `type` is unique, so match on it to update in place.
        if (row.type != null) {
          const existing = await this.prisma.notificationTemplate.findUnique({
            where: { type: row.type },
            select: { id: true },
          });
          if (existing) {
            await this.prisma.notificationTemplate.update({
              where: { id: existing.id },
              data,
            });
            return { outcome: 'updated', id: existing.id };
          }
        }

        requireBulkFields(row, ['type', 'title', 'message']);
        const created = await this.prisma.notificationTemplate.create({
          data: {
            type: row.type!,
            title: row.title!,
            message: row.message!,
            isActive: row.isActive ?? undefined,
          },
        });
        return { outcome: 'created', id: created.id };
      });
    } finally {
      this.invalidateNotificationCopy();
    }
  }

  async bulkUpsertNotificationTemplateTranslations({
    adminId,
    rows,
    language,
  }: {
    adminId: string;
    rows: NotificationTemplateTranslationUpsertRowInput[];
    language: Language;
  }) {
    this.assertAdmin({ adminId, t: accountMessages[language] });

    try {
      return await processBulkRows(this.logger, rows, async (row) => {
        const data = pickDefined({ title: row.title, message: row.message });

        if (row.id != null) {
          await this.prisma.notificationTemplateTranslation.update({
            where: { id: row.id },
            data,
          });
          return { outcome: 'updated', id: row.id };
        }

        const { notificationTemplateId, language: rowLanguage } = row;
        if (notificationTemplateId == null || !rowLanguage) {
          throw new Error(
            'notificationTemplateId and language are required when no id is provided',
          );
        }

        const existing =
          await this.prisma.notificationTemplateTranslation.findUnique({
            where: {
              notificationTemplateId_language: {
                notificationTemplateId,
                language: rowLanguage,
              },
            },
            select: { id: true },
          });

        if (existing) {
          await this.prisma.notificationTemplateTranslation.update({
            where: { id: existing.id },
            data,
          });
          return { outcome: 'updated', id: existing.id };
        }

        requireBulkFields(row, ['title', 'message']);
        const created =
          await this.prisma.notificationTemplateTranslation.create({
            data: {
              notificationTemplateId,
              language: rowLanguage,
              title: row.title!,
              message: row.message!,
            },
          });
        return { outcome: 'created', id: created.id };
      });
    } finally {
      this.invalidateNotificationCopy();
    }
  }

  // ─── Bulk helpers ───────────────────────────────────────────────────────────

  /**
   * Parses the JSON-text `benefits` cell for a `Json?` column: `undefined`
   * leaves it untouched, an empty cell clears it (`Prisma.DbNull`), otherwise
   * the parsed JSON value is stored.
   */
  private parseBenefits(
    benefits?: string | null,
  ): Prisma.InputJsonValue | typeof Prisma.DbNull | undefined {
    if (benefits === undefined) return undefined;
    if (benefits === null || benefits.trim() === '') return Prisma.DbNull;
    try {
      return JSON.parse(benefits) as Prisma.InputJsonValue;
    } catch {
      throw new Error('benefits: not valid JSON');
    }
  }
}
