import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import {
  UnAuthorizedError,
  BadRequestError,
  InternalServerError,
} from '../common/exceptions';
import { hash, genSalt } from 'bcrypt';
import { SellerType } from '@prisma/client';
import {
  RegisterPersonInput,
  RegisterBusinessInput,
  UpdateSellerInput,
  UpdatePersonProfileInput,
  UpdateBusinessProfileInput,
  UpdateSellerPreferencesInput,
} from './dto';
import { Seller } from 'src/types/seller';

@Injectable()
export class SellersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  private readonly sellerInclude = {
    personProfile: true,
    businessProfile: true,
    country: true,
    region: true,
    city: true,
    county: true,
    sellerLevel: true,
    sellerPreferences: true,
  };

  async getSellers(
    sellerId: string,
    sellerType?: SellerType,
    isActive?: boolean,
    isVerified?: boolean,
    limit?: number,
    offset?: number,
  ) {
    try {
      if (!sellerId) {
        throw new UnAuthorizedError('No autorizado');
      }

      const where: Record<string, any> = {};
      if (sellerType) where.sellerType = sellerType;
      if (isActive !== undefined) where.isActive = isActive;
      if (isVerified !== undefined) where.isVerified = isVerified;

      const sellers = await this.prisma.seller.findMany({
        where,
        include: this.sellerInclude,
        orderBy: { createdAt: 'desc' },
        take: limit || undefined,
        skip: offset || undefined,
      });

      return sellers;
    } catch (error) {
      if (error instanceof UnAuthorizedError) throw error;
      console.error('Error al obtener usuarios:', error);
      throw new InternalServerError('Error al obtener usuarios');
    }
  }

  async getSellerById(id: string, sellerId: string) {
    try {
      if (!sellerId) {
        throw new UnAuthorizedError('No autorizado');
      }

      const seller = await this.prisma.seller.findUnique({
        where: { id },
        include: this.sellerInclude,
      });

      return seller;
    } catch (error) {
      if (error instanceof UnAuthorizedError) throw error;
      console.error('Error al obtener usuario por ID:', error);
      throw new InternalServerError('Error al obtener usuario por ID');
    }
  }

  async getSellerByIdForReference(id: string) {
    try {
      const seller = await this.prisma.seller.findUnique({
        where: { id },
        include: this.sellerInclude,
      });

      return seller;
    } catch (error) {
      console.error('Error al obtener seller para federación:', error);
      return null;
    }
  }

  async getMe(sellerId: string) {
    try {
      if (!sellerId) {
        throw new UnAuthorizedError('No autorizado');
      }

      const sellerType = await this.prisma.seller.findUnique({
        where: { id: sellerId },
        select: { sellerType: true },
      });

      if (sellerType?.sellerType === 'PERSON') {
        const userProfile = await this.prisma.seller.findUnique({
          where: { id: sellerId },
          include: {
            personProfile: true,
            country: true,
            region: true,
            city: true,
            county: true,
            sellerLevel: true,
            sellerPreferences: true,
          },
        });

        return userProfile;
      } else if (
        sellerType?.sellerType === 'STARTUP' ||
        sellerType?.sellerType === 'COMPANY'
      ) {
        const businessProfile = await this.prisma.seller.findUnique({
          where: { id: sellerId },
          include: {
            businessProfile: true,
            country: true,
            region: true,
            city: true,
            county: true,
            sellerLevel: true,
            sellerPreferences: true,
          },
        });

        return businessProfile;
      }

      return null;
    } catch (error) {
      if (error instanceof UnAuthorizedError) throw error;
      console.error('Error al obtener usuario actual:', error);
      throw new InternalServerError('Error al obtener usuario actual');
    }
  }

  async getSellerLevels() {
    try {
      const levels = await this.prisma.sellerLevel.findMany({
        orderBy: { levelName: 'asc' },
      });
      return levels;
    } catch (error) {
      console.error('Error al obtener niveles de vendedor:', error);
      throw new InternalServerError('Error al obtener niveles de vendedor');
    }
  }

  async getSellerLevel(id: string) {
    try {
      const level = await this.prisma.sellerLevel.findUnique({
        where: { id: Number(id) },
      });
      return level;
    } catch (error) {
      console.error('Error al obtener nivel de vendedor:', error);
      throw new InternalServerError('Error al obtener nivel de vendedor');
    }
  }

  async registerPerson(input: RegisterPersonInput) {
    try {
      const { email, password, firstName, lastName } = input;

      const existingUser = await this.prisma.seller.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (existingUser) {
        throw new BadRequestError('Ya existe un usuario con este email');
      }

      const salt = await genSalt(12);
      const hashedPassword = await hash(password, salt);

      const result = await this.prisma.$transaction(async (tx) => {
        const user = await tx.seller.create({
          data: {
            email: email.toLowerCase(),
            password: hashedPassword,
            sellerType: 'PERSON',
            updatedAt: new Date(),
          },
        });

        await tx.personProfile.create({
          data: {
            sellerId: user.id,
            firstName,
            lastName,
          },
        });

        return user;
      });

      await this.mailService.sendWelcomeEmail(
        email.toLowerCase(),
        firstName,
        '',
      );

      return result;
    } catch (error) {
      if (error instanceof BadRequestError) throw error;
      console.error('Error al registrar persona:', error);
      throw new InternalServerError('Error al registrar persona');
    }
  }

  async registerBusiness(input: RegisterBusinessInput) {
    try {
      const { email, password, businessName, businessType, sellerType } = input;

      const existingUser = await this.prisma.seller.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (existingUser) {
        throw new BadRequestError('Ya existe un usuario con este email');
      }

      const salt = await genSalt(12);
      const hashedPassword = await hash(password, salt);

      const result = await this.prisma.$transaction(async (tx) => {
        const user = await tx.seller.create({
          data: {
            email: email.toLowerCase(),
            password: hashedPassword,
            sellerType,
            updatedAt: new Date(),
          },
        });

        await tx.businessProfile.create({
          data: {
            sellerId: user.id,
            businessName,
            updatedAt: new Date(),
            businessType,
          },
        });

        return user;
      });

      await this.mailService.sendWelcomeEmail(
        email.toLowerCase(),
        '',
        businessName,
      );

      return result;
    } catch (error) {
      if (error instanceof BadRequestError) throw error;
      console.error('Error al registrar negocio:', error);
      throw new InternalServerError('Error al registrar negocio');
    }
  }

  async updateSeller(sellerId: string, input: UpdateSellerInput) {
    try {
      if (!sellerId) {
        throw new UnAuthorizedError('No autorizado');
      }

      const result = await this.prisma.seller.update({
        where: { id: sellerId },
        data: input,
        include: {
          country: true,
          region: true,
          city: true,
          county: true,
          sellerLevel: true,
        },
      });

      return result;
    } catch (error) {
      if (error instanceof UnAuthorizedError) throw error;
      console.error('Error al actualizar usuario:', error);
      throw new InternalServerError('Error al actualizar usuario');
    }
  }

  async updatePersonProfile(sellerId: string, input: UpdatePersonProfileInput) {
    try {
      if (!sellerId) {
        throw new UnAuthorizedError('No autorizado');
      }

      const processedInput: UpdatePersonProfileInput & {
        birthday?: Date | string;
      } = { ...input };
      if (
        processedInput.birthday &&
        typeof processedInput.birthday === 'string'
      ) {
        const date = new Date(processedInput.birthday);
        const now = new Date();
        date.setHours(
          now.getHours(),
          now.getMinutes(),
          now.getSeconds(),
          now.getMilliseconds(),
        );
        processedInput.birthday = date;
      }

      const person = await this.prisma.personProfile.update({
        where: { sellerId },
        data: processedInput,
      });

      return person;
    } catch (error) {
      if (error instanceof UnAuthorizedError) throw error;
      console.error('Error al actualizar perfil de persona:', error);
      throw new InternalServerError('Error al actualizar perfil de persona');
    }
  }

  async updateBusinessProfile(
    sellerId: string,
    input: UpdateBusinessProfileInput,
  ) {
    try {
      if (!sellerId) {
        throw new UnAuthorizedError('No autorizado');
      }

      const business = await this.prisma.businessProfile.update({
        where: { sellerId },
        data: input,
      });

      return business;
    } catch (error) {
      if (error instanceof UnAuthorizedError) throw error;
      console.error('Error al actualizar perfil de tienda:', error);
      throw new InternalServerError('Error al actualizar perfil de tienda');
    }
  }

  async updateSellerPreferences(
    sellerId: string,
    input: UpdateSellerPreferencesInput,
  ) {
    try {
      if (!sellerId) {
        throw new UnAuthorizedError('No autorizado');
      }

      const preferences = await this.prisma.sellerPreferences.upsert({
        where: { sellerId },
        update: input,
        create: {
          sellerId,
          ...input,
        },
      });

      return preferences;
    } catch (error) {
      if (error instanceof UnAuthorizedError) throw error;
      console.error('Error al actualizar preferencias:', error);
      throw new InternalServerError('Error al actualizar preferencias');
    }
  }

  resolveProfile(seller: Seller) {
    if (seller && seller.sellerType === 'PERSON' && seller.profile) {
      return { ...seller.profile, __typename: 'PersonProfile' };
    }
    if (
      seller &&
      (seller.sellerType === 'STARTUP' || seller.sellerType === 'COMPANY') &&
      seller.profile
    ) {
      return { ...seller.profile, __typename: 'BusinessProfile' };
    }
    return null;
  }
}
