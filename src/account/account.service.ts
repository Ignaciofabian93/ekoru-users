import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  UnAuthorizedError,
  BadRequestError,
  InternalServerError,
} from '../common/exceptions';
import { hash, genSalt, compare } from 'bcrypt';

@Injectable()
export class AccountService {
  constructor(private readonly prisma: PrismaService) {}

  async deactivateAccount(sellerId: string) {
    try {
      if (!sellerId) {
        throw new UnAuthorizedError('No autorizado');
      }

      const seller = await this.prisma.seller.update({
        where: { id: sellerId },
        data: { isActive: false },
      });

      return seller;
    } catch (error) {
      if (error instanceof UnAuthorizedError) throw error;
      console.error('Error al desactivar cuenta:', error);
      throw new InternalServerError('Error al desactivar cuenta');
    }
  }

  async reactivateAccount(sellerId: string) {
    try {
      if (!sellerId) {
        throw new UnAuthorizedError('No autorizado');
      }

      const seller = await this.prisma.seller.update({
        where: { id: sellerId },
        data: { isActive: true },
      });

      return seller;
    } catch (error) {
      if (error instanceof UnAuthorizedError) throw error;
      console.error('Error reactivating account:', error);
      throw new InternalServerError('Error al activar cuenta');
    }
  }

  async addPoints(sellerId: string, targetId: string, points: number) {
    try {
      if (!sellerId) {
        throw new UnAuthorizedError('No autorizado');
      }

      const seller = await this.prisma.seller.update({
        where: { id: targetId },
        data: { points: { increment: points } },
      });

      return seller;
    } catch (error) {
      if (error instanceof UnAuthorizedError) throw error;
      console.error('Error adding points:', error);
      throw new InternalServerError('Error al incrementar puntos');
    }
  }

  async deductPoints(sellerId: string, targetId: string, points: number) {
    try {
      if (!sellerId) {
        throw new UnAuthorizedError('No autorizado');
      }

      const seller = await this.prisma.seller.update({
        where: { id: targetId },
        data: { points: { decrement: points } },
      });

      return seller;
    } catch (error) {
      if (error instanceof UnAuthorizedError) throw error;
      console.error('Error deducting points:', error);
      throw new InternalServerError('Error al reducir puntos');
    }
  }

  async updateSellerCategory(
    sellerId: string,
    targetId: string,
    categoryId: number,
  ) {
    try {
      if (!sellerId) {
        throw new UnAuthorizedError('No autorizado');
      }

      const parsedCategoryId = Number(categoryId);
      const seller = await this.prisma.seller.update({
        where: { id: targetId },
        data: { sellerLevelId: parsedCategoryId },
      });

      return seller;
    } catch (error) {
      if (error instanceof UnAuthorizedError) throw error;
      console.error('Error updating user category:', error);
      throw new InternalServerError('Error updating user category');
    }
  }

  async updatePassword(
    sellerId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    try {
      if (!sellerId) {
        throw new UnAuthorizedError('No autorizado');
      }

      const seller = await this.prisma.seller.findUnique({
        where: { id: sellerId },
      });

      if (!seller || !(await compare(currentPassword, seller.password))) {
        throw new BadRequestError('La contraseña actual es incorrecta');
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
      console.error('Error al actualizar contraseña:', error);
      throw new InternalServerError('Error al actualizar contraseña');
    }
  }

  requestPasswordReset(email: string) {
    // TODO: Implement password reset logic
    console.log('email: ', email);
    return true;
  }
}
