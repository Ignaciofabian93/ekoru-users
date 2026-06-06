import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import {
  UnAuthorizedError,
  BadRequestError,
  InternalServerError,
} from '../common/exceptions';
import { hash, genSalt } from 'bcrypt';
import {
  RegisterPersonInput,
  RegisterBusinessInput,
  UpdateSellerInput,
  UpdatePersonProfileInput,
  UpdateBusinessProfileInput,
  UpdateSellerPreferencesInput,
} from './dto';
import { Language, SellerType } from '../graphql/enums';
import { sellerMessages } from './sellers.i18n';
import {
  calculatePrismaParams,
  createPaginatedResponse,
} from '../utils/pagination';

@Injectable()
export class SellersService {
  private readonly logger = new Logger(SellersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  private getSellerInclude(language: Language) {
    return {
      personProfile: true,
      businessProfile: true,
      country: {
        select: {
          id: true,
          createdAt: true,
          updatedAt: true,
          translation: { where: { language }, select: { name: true } },
        },
      },
      region: true,
      city: true,
      county: true,
      sellerLevel: true,
      sellerPreferences: true,
    };
  }

  private mapCountry(
    country: {
      id: number;
      createdAt: Date;
      updatedAt: Date;
      translation?: { name: string }[];
    } | null,
  ) {
    if (!country) return null;
    return {
      id: country.id,
      country: country.translation?.[0]?.name ?? null,
      createdAt: country.createdAt,
      updatedAt: country.updatedAt,
    };
  }

  async getSellers(
    sellerId: string,
    language: Language,
    sellerType?: SellerType,
    isActive?: boolean,
    isVerified?: boolean,
    page: number = 1,
    pageSize: number = 10,
  ) {
    const t = sellerMessages[language];
    try {
      if (!sellerId) {
        throw new UnAuthorizedError(t.unauthorized);
      }

      const where: Record<string, any> = {};
      if (sellerType) where.sellerType = sellerType;
      if (isActive !== undefined) where.isActive = isActive;
      if (isVerified !== undefined) where.isVerified = isVerified;

      const { skip, take } = calculatePrismaParams(page, pageSize);

      const [count, sellers] = await Promise.all([
        this.prisma.seller.count({ where }),
        this.prisma.seller.findMany({
          where,
          include: this.getSellerInclude(language),
          orderBy: { createdAt: 'desc' },
          skip,
          take,
        }),
      ]);

      const nodes = sellers.map((seller) => ({
        ...seller,
        country: this.mapCountry(seller.country),
      }));

      return createPaginatedResponse(nodes, count, page, pageSize);
    } catch (error) {
      if (error instanceof UnAuthorizedError) throw error;
      this.logger.error(t.errorGetSellers, error);
      throw new InternalServerError(t.errorGetSellers);
    }
  }

  async getSellerById(id: string, sellerId: string, language: Language) {
    const t = sellerMessages[language];
    try {
      if (!sellerId) {
        throw new UnAuthorizedError(t.unauthorized);
      }

      const seller = await this.prisma.seller.findUnique({
        where: { id },
        include: this.getSellerInclude(language),
      });

      if (!seller) return null;
      return { ...seller, country: this.mapCountry(seller.country) };
    } catch (error) {
      if (error instanceof UnAuthorizedError) throw error;
      this.logger.error(t.errorGetSellerById, error);
      throw new InternalServerError(t.errorGetSellerById);
    }
  }

  async getSellerByIdForReference(id: string) {
    try {
      const seller = await this.prisma.seller.findUnique({
        where: { id },
        include: this.getSellerInclude(Language.ES),
      });

      if (!seller) return null;
      return { ...seller, country: this.mapCountry(seller.country) };
    } catch (error) {
      this.logger.error('Error al obtener seller para federación:', error);
      return null;
    }
  }

  async getMe(sellerId: string, language: Language) {
    const t = sellerMessages[language];
    try {
      if (!sellerId) {
        throw new UnAuthorizedError(t.unauthorized);
      }

      const sellerType = await this.prisma.seller.findUnique({
        where: { id: sellerId },
        select: { sellerType: true },
      });

      if (sellerType?.sellerType === SellerType.PERSON) {
        const userProfile = await this.prisma.seller.findUnique({
          where: { id: sellerId },
          include: {
            personProfile: true,
            country: {
              select: {
                id: true,
                createdAt: true,
                updatedAt: true,
                translation: { where: { language }, select: { name: true } },
              },
            },
            region: true,
            city: true,
            county: true,
            sellerLevel: true,
            sellerPreferences: true,
          },
        });

        if (!userProfile) return null;

        const { country, ...rest } = userProfile;
        const mappedProfile = {
          ...rest,
          country: country
            ? {
                id: country.id,
                country: country.translation?.[0]?.name ?? null,
                createdAt: country.createdAt,
                updatedAt: country.updatedAt,
              }
            : null,
        };

        return mappedProfile;
      } else if (
        sellerType?.sellerType === SellerType.STARTUP ||
        sellerType?.sellerType === SellerType.COMPANY
      ) {
        const businessProfile = await this.prisma.seller.findUnique({
          where: { id: sellerId },
          include: {
            businessProfile: true,
            country: {
              select: {
                id: true,
                createdAt: true,
                updatedAt: true,
                translation: { where: { language }, select: { name: true } },
              },
            },
            region: true,
            city: true,
            county: true,
            sellerLevel: true,
            sellerPreferences: true,
          },
        });

        if (!businessProfile) return null;
        const { country, ...businessRest } = businessProfile;
        return { ...businessRest, country: this.mapCountry(country) };
      }

      return null;
    } catch (error) {
      if (error instanceof UnAuthorizedError) throw error;
      this.logger.error(t.errorGetMe, error);
      throw new InternalServerError(t.errorGetMe);
    }
  }

  async getSellerLevels(language: Language) {
    const t = sellerMessages[language];
    try {
      const levels = await this.prisma.sellerLevel.findMany({
        orderBy: { levelName: 'asc' },
      });
      return levels;
    } catch (error) {
      this.logger.error(t.errorGetSellerLevels, error);
      throw new InternalServerError(t.errorGetSellerLevels);
    }
  }

  async getSellerLevel(id: string, language: Language) {
    const t = sellerMessages[language];
    try {
      const level = await this.prisma.sellerLevel.findUnique({
        where: { id: Number(id) },
      });
      return level;
    } catch (error) {
      this.logger.error(t.errorGetSellerLevel, error);
      throw new InternalServerError(t.errorGetSellerLevel);
    }
  }

  async registerPerson(input: RegisterPersonInput, language: Language) {
    const t = sellerMessages[language];
    try {
      const { email, password, firstName, lastName } = input;

      const existingUser = await this.prisma.seller.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (existingUser) {
        throw new BadRequestError(t.emailAlreadyExists);
      }

      const salt = await genSalt(12);
      const hashedPassword = await hash(password, salt);

      const pointsForRegistration =
        await this.prisma.pointsByTransactionKind.findFirst({
          where: { transactionKind: 'REGISTRATION' },
        });

      const result = await this.prisma.$transaction(async (tx) => {
        const user = await tx.seller.create({
          data: {
            email: email.toLowerCase(),
            password: hashedPassword,
            sellerType: SellerType.PERSON,
            updatedAt: new Date(),
            points: pointsForRegistration?.pointsAwarded || 10,
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
        language.toLowerCase() as Language,
      );

      return result;
    } catch (error) {
      if (error instanceof BadRequestError) throw error;
      this.logger.error(t.errorRegisterPerson, error);
      throw new InternalServerError(t.errorRegisterPerson);
    }
  }

  async registerBusiness(input: RegisterBusinessInput, language: Language) {
    const t = sellerMessages[language];
    try {
      const { email, password, businessName, businessType, sellerType } = input;

      const existingUser = await this.prisma.seller.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (existingUser) {
        throw new BadRequestError(t.emailAlreadyExists);
      }

      const salt = await genSalt(12);
      const hashedPassword = await hash(password, salt);

      const pointsForRegistration =
        await this.prisma.pointsByTransactionKind.findFirst({
          where: { transactionKind: 'REGISTRATION' },
        });

      const result = await this.prisma.$transaction(async (tx) => {
        const user = await tx.seller.create({
          data: {
            email: email.toLowerCase(),
            password: hashedPassword,
            sellerType,
            updatedAt: new Date(),
            points: pointsForRegistration?.pointsAwarded || 10,
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
        language.toLowerCase() as Language,
      );

      return result;
    } catch (error) {
      if (error instanceof BadRequestError) throw error;
      this.logger.error(t.errorRegisterBusiness, error);
      throw new InternalServerError(t.errorRegisterBusiness);
    }
  }

  async updateSeller(
    sellerId: string,
    input: UpdateSellerInput,
    language: Language,
  ) {
    const t = sellerMessages[language];
    try {
      if (!sellerId) {
        throw new UnAuthorizedError(t.unauthorized);
      }

      const result = await this.prisma.seller.update({
        where: { id: sellerId },
        data: input,
        include: {
          country: {
            select: {
              id: true,
              createdAt: true,
              updatedAt: true,
              translation: { where: { language }, select: { name: true } },
            },
          },
          region: true,
          city: true,
          county: true,
          sellerLevel: true,
        },
      });

      const { country, ...updateRest } = result;
      return { ...updateRest, country: this.mapCountry(country) };
    } catch (error) {
      if (error instanceof UnAuthorizedError) throw error;
      this.logger.error(t.errorUpdateSeller, error);
      throw new InternalServerError(t.errorUpdateSeller);
    }
  }

  async updatePersonProfile(
    sellerId: string,
    input: UpdatePersonProfileInput,
    language: Language,
  ) {
    const t = sellerMessages[language];
    try {
      if (!sellerId) {
        throw new UnAuthorizedError(t.unauthorized);
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
      this.logger.error(t.errorUpdatePersonProfile, error);
      throw new InternalServerError(t.errorUpdatePersonProfile);
    }
  }

  async updateBusinessProfile(
    sellerId: string,
    input: UpdateBusinessProfileInput,
    language: Language,
  ) {
    const t = sellerMessages[language];
    try {
      if (!sellerId) {
        throw new UnAuthorizedError(t.unauthorized);
      }

      const business = await this.prisma.businessProfile.update({
        where: { sellerId },
        data: input,
      });

      return business;
    } catch (error) {
      if (error instanceof UnAuthorizedError) throw error;
      this.logger.error(t.errorUpdateBusinessProfile, error);
      throw new InternalServerError(t.errorUpdateBusinessProfile);
    }
  }

  async updateSellerPreferences(
    sellerId: string,
    input: UpdateSellerPreferencesInput,
    language: Language,
  ) {
    const t = sellerMessages[language];
    try {
      if (!sellerId) {
        throw new UnAuthorizedError(t.unauthorized);
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
      this.logger.error(t.errorUpdatePreferences, error);
      throw new InternalServerError(t.errorUpdatePreferences);
    }
  }

  resolveProfile(seller: any) {
    if (
      seller &&
      seller.sellerType === SellerType.PERSON &&
      seller.personProfile
    ) {
      return { ...seller.personProfile, __typename: 'PersonProfile' };
    }
    if (
      seller &&
      (seller.sellerType === SellerType.STARTUP ||
        seller.sellerType === SellerType.COMPANY) &&
      seller.businessProfile
    ) {
      return { ...seller.businessProfile, __typename: 'BusinessProfile' };
    }
    return null;
  }
}
