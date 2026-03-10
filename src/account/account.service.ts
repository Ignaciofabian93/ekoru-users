import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  UnAuthorizedError,
  BadRequestError,
  InternalServerError,
} from '../common/exceptions';
import { hash, genSalt, compare } from 'bcrypt';
import { Language } from '../graphql/enums';
import { accountMessages } from './account.i18n';

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
}
