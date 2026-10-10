import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { PointsService } from '../points/points.service';
import {
  UnAuthorizedError,
  BadRequestError,
  NotFoundError,
  InternalServerError,
} from '../common/exceptions';
import { hash, genSalt, compare } from 'bcrypt';
import {
  RegisterPersonInput,
  RegisterBusinessInput,
  UpdateSellerInput,
  UpdatePersonProfileInput,
  UpdateBusinessProfileInput,
  UpdateSellerPreferencesInput,
  BanSellerInput,
  AddBusinessAddressInput,
  UpdateBusinessAddressInput,
  ReapplyBusinessInput,
  APPLICATION_MESSAGE_MIN_LENGTH,
} from './dto';
import {
  Language,
  SellerType,
  AdminType,
  AdminPermission,
  BusinessType,
  BusinessApprovalStatus,
} from '../graphql/enums';
import { sellerMessages, SellerMessages } from './sellers.i18n';
import {
  adminRowCan,
  assertAdminCan,
  loadAdminAccess,
} from '../common/admin-access';
import {
  businessAddressMessages,
  BusinessAddressMessages,
} from './business-address.i18n';
import {
  calculatePrismaParams,
  createPaginatedResponse,
} from '../utils/pagination';

/** Shortest rejection reason accepted — the business receives it by email. */
const REJECTION_REASON_MIN_LENGTH = 10;

/**
 * Password guessing through `reapplyBusiness` counts against the same lock as
 * the gateway's login (ekoru-gateway `auth.service.ts`): 8 failures lock the
 * account for 15 minutes. Keep the two in step.
 */
const MAX_LOGIN_ATTEMPTS = 8;
const LOCKOUT_MS = 15 * 60 * 1000;

/**
 * A real bcrypt hash of a value nothing can match, compared against when the
 * email is unknown so "no such account" takes as long as "wrong password".
 * Same value as the gateway's.
 */
const DUMMY_HASH =
  '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

@Injectable()
export class SellersService {
  private readonly logger = new Logger(SellersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly points: PointsService,
  ) {}

  /**
   * The welcome points (REGISTRATION rule), through the points engine so the
   * award is in the seller's history. Never fails a sign-up. Returns the
   * points credited.
   */
  private async awardRegistration(sellerId: string): Promise<number> {
    try {
      return await this.points.award({
        sellerId,
        kind: 'REGISTRATION',
        reference: 'registration',
      });
    } catch (error) {
      this.logger.error(`Registration points failed for ${sellerId}`, error);
      return 0;
    }
  }

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

  async getSellers({
    language,
    adminId,
    sellerType,
    businessType,
    approvalStatus,
    isActive,
    isVerified,
    page = 1,
    pageSize = 20,
    searchQuery,
  }: {
    language: Language;
    adminId?: string;
    sellerType?: SellerType;
    businessType?: BusinessType;
    approvalStatus?: BusinessApprovalStatus;
    isActive?: boolean;
    isVerified?: boolean;
    page?: number;
    pageSize?: number;
    searchQuery?: string;
  }) {
    const t = sellerMessages[language];
    try {
      const where: Record<string, any> = {};
      if (sellerType) where.sellerType = sellerType;
      if (isActive !== undefined) where.isActive = isActive;
      if (isVerified !== undefined) where.isVerified = isVerified;
      if (searchQuery) {
        where.OR = [{ email: { contains: searchQuery, mode: 'insensitive' } }];
      }
      if (businessType || approvalStatus) {
        where.businessProfile = {
          // MIXED sellers serve both retail and service. Always included.
          ...(businessType && {
            businessType: { in: [businessType, BusinessType.MIXED] },
          }),
          ...(approvalStatus && { approvalStatus }),
        };
      }
      // Public listings (the home page's stores and services) show only
      // businesses EKORU has approved (USR-2). Private individuals are never
      // listed: their email and phone live on Seller, and a public list would
      // hand them out in bulk. Admins with MANAGE_USERS see every account,
      // including the pending review queue.
      if (adminId) {
        await this.assertAdminCan({
          adminId,
          permission: AdminPermission.MANAGE_USERS,
          t,
        });
      } else {
        where.businessProfile = {
          ...(where.businessProfile ?? {}),
          approvalStatus: BusinessApprovalStatus.APPROVED,
        };
      }

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

  /**
   * One seller by id. A business EKORU has not approved (pending or rejected)
   * reads as not found (null) for everyone except the business itself, its
   * own business admin account, and platform admins with MANAGE_USERS (USR-2).
   */
  async getSellerById({
    id,
    language,
    sellerId,
    adminId,
  }: {
    id: string;
    language: Language;
    sellerId?: string;
    adminId?: string;
  }) {
    const t = sellerMessages[language];
    try {
      const seller = await this.prisma.seller.findUnique({
        where: { id },
        include: this.getSellerInclude(language),
      });

      if (!seller) return null;
      const approval = seller.businessProfile?.approvalStatus;
      if (
        approval &&
        approval !== BusinessApprovalStatus.APPROVED &&
        !(await this.canSeeUnapprovedBusiness(seller.id, sellerId, adminId))
      ) {
        return null;
      }
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

  async getMe({
    sellerId,
    language,
    adminId,
  }: {
    sellerId: string;
    language: Language;
    adminId: string;
  }) {
    const t = sellerMessages[language];
    try {
      if (!sellerId && !adminId) {
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

  async getSellerLevel({ id, language }: { id: string; language: Language }) {
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

  async registerPerson({
    input,
    language,
  }: {
    input: RegisterPersonInput;
    language: Language;
  }) {
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

      const result = await this.prisma.$transaction(async (tx) => {
        const user = await tx.seller.create({
          data: {
            email: email.toLowerCase(),
            password: hashedPassword,
            sellerType: SellerType.PERSON,
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

      const welcomePoints = await this.awardRegistration(result.id);

      await this.mailService.sendWelcomeEmail({
        email: email.toLowerCase(),
        name: firstName,
        businessName: '',
        locale: language.toLowerCase() as Language,
      });

      return { ...result, points: result.points + welcomePoints };
    } catch (error) {
      if (error instanceof BadRequestError) throw error;
      this.logger.error(t.errorRegisterPerson, error);
      throw new InternalServerError(t.errorRegisterPerson);
    }
  }

  async registerBusiness({
    input,
    language,
  }: {
    input: RegisterBusinessInput;
    language: Language;
  }) {
    const t = sellerMessages[language];
    try {
      const { email, password, businessName, businessType, sellerType } = input;

      // The DTO bounds the raw length; padding with whitespace must not pass.
      const applicationMessage = input.applicationMessage.trim();
      if (applicationMessage.length < APPLICATION_MESSAGE_MIN_LENGTH) {
        throw new BadRequestError(t.applicationMessageTooShort);
      }

      const existingUser = await this.prisma.seller.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (existingUser) {
        throw new BadRequestError(t.emailAlreadyExists);
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
            // Emails pick their language from here; the review outcome must
            // reach the business in the language it signed up in.
            contentLanguage: language,
          },
        });

        // approvalStatus defaults to PENDING: the gateway refuses the login
        // until EKORU approves the account.
        await tx.businessProfile.create({
          data: {
            sellerId: user.id,
            businessName,
            updatedAt: new Date(),
            businessType,
            applicationMessage,
          },
        });

        return user;
      });

      const welcomePoints = await this.awardRegistration(result.id);

      // The approval email doubles as the welcome. Until then the business
      // only learns that its application is waiting, and EKORU's review inbox
      // gets the application.
      await Promise.all([
        this.mailService.sendBusinessApplicationReceivedEmail({
          email: result.email,
          locale: language,
          data: { businessName },
        }),
        this.mailService.sendBusinessApplicationReviewEmail({
          data: {
            sellerId: result.id,
            businessName,
            email: result.email,
            sellerType,
            businessType,
            message: applicationMessage,
            submittedAt: result.createdAt,
          },
        }),
      ]);

      return { ...result, points: result.points + welcomePoints };
    } catch (error) {
      if (error instanceof BadRequestError) throw error;
      this.logger.error(t.errorRegisterBusiness, error);
      throw new InternalServerError(t.errorRegisterBusiness);
    }
  }

  /**
   * A rejected business sends EKORU a new application (USR-5). It cannot sign
   * in, so the account is identified by email and password, under the same
   * lockout as the login. The application goes back to PENDING, the previous
   * rejection reason travels to the review inbox with the new message, and the
   * business gets the "application received" email again.
   *
   * Unknown email and wrong password give the same answer, so this cannot be
   * used to find out which addresses have accounts.
   */
  async reapplyBusiness({
    input,
    language,
  }: {
    input: ReapplyBusinessInput;
    language: Language;
  }): Promise<boolean> {
    const t = sellerMessages[language];
    try {
      const applicationMessage = input.applicationMessage.trim();
      if (applicationMessage.length < APPLICATION_MESSAGE_MIN_LENGTH) {
        throw new BadRequestError(t.applicationMessageTooShort);
      }

      const seller = await this.prisma.seller.findUnique({
        where: { email: input.email.trim().toLowerCase() },
        select: {
          id: true,
          email: true,
          password: true,
          sellerType: true,
          loginAttempts: true,
          lockedUntil: true,
          businessProfile: {
            select: {
              businessName: true,
              businessType: true,
              approvalStatus: true,
              rejectionReason: true,
            },
          },
        },
      });

      if (!seller) {
        await compare(input.password, DUMMY_HASH);
        throw new BadRequestError(t.reapplyInvalidCredentials);
      }
      if (seller.lockedUntil && seller.lockedUntil > new Date()) {
        throw new BadRequestError(t.reapplyAccountLocked);
      }
      if (!(await compare(input.password, seller.password))) {
        const attempts = seller.loginAttempts + 1;
        await this.prisma.seller.update({
          where: { id: seller.id },
          data: {
            loginAttempts: attempts,
            lockedUntil:
              attempts >= MAX_LOGIN_ATTEMPTS
                ? new Date(Date.now() + LOCKOUT_MS)
                : null,
          },
        });
        throw new BadRequestError(t.reapplyInvalidCredentials);
      }

      const profile = seller.businessProfile;
      if (profile?.approvalStatus !== BusinessApprovalStatus.REJECTED) {
        throw new BadRequestError(t.businessNotRejected);
      }

      const now = new Date();
      await this.prisma.$transaction([
        this.prisma.businessProfile.update({
          where: { sellerId: seller.id },
          data: {
            approvalStatus: BusinessApprovalStatus.PENDING,
            applicationMessage,
            rejectionReason: null,
            reviewedAt: null,
            reviewedById: null,
          },
        }),
        this.prisma.seller.update({
          where: { id: seller.id },
          data: { loginAttempts: 0, lockedUntil: null },
        }),
      ]);

      await Promise.all([
        this.mailService.sendBusinessApplicationReceivedEmail({
          email: seller.email,
          locale: language,
          data: { businessName: profile.businessName },
        }),
        this.mailService.sendBusinessApplicationReviewEmail({
          data: {
            sellerId: seller.id,
            businessName: profile.businessName,
            email: seller.email,
            sellerType: seller.sellerType,
            businessType: profile.businessType,
            message: applicationMessage,
            submittedAt: now,
            previousRejectionReason: profile.rejectionReason,
          },
        }),
      ]);

      return true;
    } catch (error) {
      if (error instanceof BadRequestError) throw error;
      this.logger.error(t.errorReapplyBusiness, error);
      throw new InternalServerError(t.errorReapplyBusiness);
    }
  }

  /**
   * Credits eco-points to a seller. Called internally by the transactions
   * subgraph when a P2P deal completes. Returns the new total.
   */
  async awardPoints(sellerId: string, points: number): Promise<number> {
    const updated = await this.prisma.seller.update({
      where: { id: sellerId },
      data: { points: { increment: points } },
      select: { points: true },
    });
    // Legacy path (older transactions deploys); the engine's
    // awardActivityPoints records history too. Keep the level in step.
    await this.points
      .updateLevel(sellerId, updated.points)
      .catch((error) =>
        this.logger.error(`Level update failed for ${sellerId}`, error),
      );
    return updated.points;
  }

  async updateSeller({
    sellerId,
    adminId,
    input,
    language,
  }: {
    sellerId: string;
    adminId: string;
    input: UpdateSellerInput;
    language: Language;
  }) {
    const t = sellerMessages[language];
    try {
      if (!sellerId && !adminId) {
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

  async updatePersonProfile({
    sellerId,
    adminId,
    input,
    language,
  }: {
    sellerId: string;
    adminId: string;
    input: UpdatePersonProfileInput;
    language: Language;
  }) {
    const t = sellerMessages[language];
    try {
      if (!sellerId && !adminId) {
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

  async updateBusinessProfile({
    sellerId,
    adminId,
    input,
    language,
  }: {
    sellerId: string;
    adminId: string;
    input: UpdateBusinessProfileInput;
    language: Language;
  }) {
    const t = sellerMessages[language];
    try {
      if (!sellerId && !adminId) {
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

  async updateSellerPreferences({
    sellerId,
    input,
    language,
    adminId,
  }: {
    sellerId: string;
    input: UpdateSellerPreferencesInput;
    language: Language;
    adminId: string;
  }) {
    const t = sellerMessages[language];
    try {
      if (!sellerId && !adminId) {
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

  // ─── Business addresses ───────────────────────────────────────────────
  // A business may have many locations (HQ, branches, other cities/countries).
  // At most one is `isPrimary`. The seller's single `Seller.address` is left
  // unchanged — these are additional locations.

  private readonly businessAddressInclude = {
    country: true,
    region: true,
    city: true,
    county: true,
  } as const;

  /** All addresses for a business profile, primary first. */
  async getBusinessAddresses(businessProfileId: string) {
    return this.prisma.businessAddress.findMany({
      where: { businessProfileId },
      include: this.businessAddressInclude,
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    });
  }

  /** The authenticated seller's own business profile (business sellers only). */
  private async getOwnedBusinessProfile(
    sellerId: string,
    t: BusinessAddressMessages,
  ) {
    if (!sellerId) throw new UnAuthorizedError(t.unauthorized);
    const profile = await this.prisma.businessProfile.findUnique({
      where: { sellerId },
      select: { id: true },
    });
    if (!profile) throw new NotFoundError(t.businessProfileNotFound);
    return profile;
  }

  async addBusinessAddress({
    sellerId,
    input,
    language,
  }: {
    sellerId: string;
    input: AddBusinessAddressInput;
    language: Language;
  }) {
    const t = businessAddressMessages[language];
    try {
      const profile = await this.getOwnedBusinessProfile(sellerId, t);
      return await this.prisma.$transaction(async (tx) => {
        if (input.isPrimary) {
          await tx.businessAddress.updateMany({
            where: { businessProfileId: profile.id },
            data: { isPrimary: false },
          });
        }
        return tx.businessAddress.create({
          data: { ...input, businessProfileId: profile.id },
          include: this.businessAddressInclude,
        });
      });
    } catch (error) {
      if (error instanceof UnAuthorizedError || error instanceof NotFoundError)
        throw error;
      this.logger.error(t.errorManage, error);
      throw new InternalServerError(t.errorManage);
    }
  }

  async updateBusinessAddress({
    sellerId,
    input,
    language,
  }: {
    sellerId: string;
    input: UpdateBusinessAddressInput;
    language: Language;
  }) {
    const t = businessAddressMessages[language];
    try {
      const profile = await this.getOwnedBusinessProfile(sellerId, t);
      const { id, ...data } = input;
      const existing = await this.prisma.businessAddress.findUnique({
        where: { id },
        select: { businessProfileId: true },
      });
      if (!existing || existing.businessProfileId !== profile.id) {
        throw new NotFoundError(t.addressNotFound);
      }
      return await this.prisma.$transaction(async (tx) => {
        if (data.isPrimary) {
          await tx.businessAddress.updateMany({
            where: { businessProfileId: profile.id },
            data: { isPrimary: false },
          });
        }
        return tx.businessAddress.update({
          where: { id },
          data,
          include: this.businessAddressInclude,
        });
      });
    } catch (error) {
      if (error instanceof UnAuthorizedError || error instanceof NotFoundError)
        throw error;
      this.logger.error(t.errorManage, error);
      throw new InternalServerError(t.errorManage);
    }
  }

  async deleteBusinessAddress({
    sellerId,
    id,
    language,
  }: {
    sellerId: string;
    id: number;
    language: Language;
  }): Promise<boolean> {
    const t = businessAddressMessages[language];
    try {
      const profile = await this.getOwnedBusinessProfile(sellerId, t);
      const existing = await this.prisma.businessAddress.findUnique({
        where: { id },
        select: { businessProfileId: true },
      });
      if (!existing || existing.businessProfileId !== profile.id) {
        throw new NotFoundError(t.addressNotFound);
      }
      await this.prisma.businessAddress.delete({ where: { id } });
      return true;
    } catch (error) {
      if (error instanceof UnAuthorizedError || error instanceof NotFoundError)
        throw error;
      this.logger.error(t.errorManage, error);
      throw new InternalServerError(t.errorManage);
    }
  }

  async setPrimaryBusinessAddress({
    sellerId,
    id,
    language,
  }: {
    sellerId: string;
    id: number;
    language: Language;
  }) {
    const t = businessAddressMessages[language];
    try {
      const profile = await this.getOwnedBusinessProfile(sellerId, t);
      const existing = await this.prisma.businessAddress.findUnique({
        where: { id },
        select: { businessProfileId: true },
      });
      if (!existing || existing.businessProfileId !== profile.id) {
        throw new NotFoundError(t.addressNotFound);
      }
      await this.prisma.$transaction([
        this.prisma.businessAddress.updateMany({
          where: { businessProfileId: profile.id, isPrimary: true },
          data: { isPrimary: false },
        }),
        this.prisma.businessAddress.update({
          where: { id },
          data: { isPrimary: true },
        }),
      ]);
      return this.getBusinessAddresses(profile.id);
    } catch (error) {
      if (error instanceof UnAuthorizedError || error instanceof NotFoundError)
        throw error;
      this.logger.error(t.errorManage, error);
      throw new InternalServerError(t.errorManage);
    }
  }

  /**
   * Ensures the caller is an admin allowed to moderate sellers. Only active
   * PLATFORM admins who are SUPER_ADMIN or hold the given permission may act.
   */
  private async assertAdminCan({
    adminId,
    permission,
    t,
  }: {
    adminId: string;
    permission: AdminPermission;
    t: SellerMessages;
  }) {
    await assertAdminCan(this.prisma, {
      adminId,
      permission,
      messages: { unauthorized: t.unauthorized, forbidden: t.forbidden },
    });
  }

  /**
   * Who may read a business that is pending or rejected: the business itself,
   * its own (active) business admin account, and platform admins with
   * MANAGE_USERS.
   */
  private async canSeeUnapprovedBusiness(
    businessId: string,
    sellerId?: string,
    adminId?: string,
  ): Promise<boolean> {
    if (sellerId && sellerId === businessId) return true;
    if (!adminId) return false;
    const admin = await loadAdminAccess(this.prisma, adminId);
    if (adminRowCan(admin, AdminPermission.MANAGE_USERS)) return true;
    return (
      !!admin &&
      admin.isActive &&
      (admin.adminType as AdminType) === AdminType.BUSINESS &&
      admin.sellerId === businessId
    );
  }

  /**
   * Toggles a seller's verified status. Done manually by an admin after
   * reviewing the account and its initial activity. Requires MANAGE_USERS.
   */
  async verifySeller({
    adminId,
    id,
    language,
  }: {
    adminId: string;
    id: string;
    language: Language;
  }) {
    const t = sellerMessages[language];
    try {
      await this.assertAdminCan({
        adminId,
        permission: AdminPermission.MANAGE_USERS,
        t,
      });

      const seller = await this.prisma.seller.findUnique({
        where: { id },
        select: { id: true, isVerified: true },
      });

      if (!seller) {
        throw new NotFoundError(t.sellerNotFound);
      }

      const updated = await this.prisma.seller.update({
        where: { id },
        data: { isVerified: !seller.isVerified },
        include: this.getSellerInclude(language),
      });

      return { ...updated, country: this.mapCountry(updated.country) };
    } catch (error) {
      if (error instanceof UnAuthorizedError || error instanceof NotFoundError)
        throw error;
      this.logger.error(t.errorVerifySeller, error);
      throw new InternalServerError(t.errorVerifySeller);
    }
  }

  /**
   * Approves a business account after EKORU's onboarding review, so it can
   * sign in. Allowed from PENDING, and from REJECTED when the business follows
   * up with what was missing. Emails the business. Requires MANAGE_USERS.
   */
  async approveBusiness({
    adminId,
    id,
    language,
  }: {
    adminId: string;
    id: string;
    language: Language;
  }) {
    const t = sellerMessages[language];
    try {
      await this.assertAdminCan({
        adminId,
        permission: AdminPermission.MANAGE_USERS,
        t,
      });

      const profile = await this.findBusinessForReview({ id, t });
      if (profile.approvalStatus === BusinessApprovalStatus.APPROVED) {
        throw new BadRequestError(t.businessAlreadyApproved);
      }

      const updated = await this.prisma.$transaction(async (tx) => {
        await tx.businessProfile.update({
          where: { sellerId: id },
          data: {
            approvalStatus: BusinessApprovalStatus.APPROVED,
            reviewedAt: new Date(),
            reviewedById: adminId,
            rejectionReason: null,
          },
        });

        await tx.adminActivityLog.create({
          data: {
            adminId,
            action: 'APPROVE_BUSINESS',
            entityType: 'Seller',
            entityId: id,
            changes: { approvalStatus: BusinessApprovalStatus.APPROVED },
            metadata: { previousStatus: profile.approvalStatus },
          },
        });

        return tx.seller.findUniqueOrThrow({
          where: { id },
          include: this.getSellerInclude(language),
        });
      });

      await this.mailService.sendBusinessApprovedEmail({
        email: updated.email,
        locale: updated.contentLanguage ?? undefined,
        data: { businessName: profile.businessName },
      });

      return { ...updated, country: this.mapCountry(updated.country) };
    } catch (error) {
      if (
        error instanceof UnAuthorizedError ||
        error instanceof NotFoundError ||
        error instanceof BadRequestError
      )
        throw error;
      this.logger.error(t.errorApproveBusiness, error);
      throw new InternalServerError(t.errorApproveBusiness);
    }
  }

  /**
   * Rejects a pending business application. The reason is stored and emailed
   * to the business, which stays unable to sign in; if it follows up, the
   * account can still be approved later. Requires MANAGE_USERS.
   */
  async rejectBusiness({
    adminId,
    id,
    reason,
    language,
  }: {
    adminId: string;
    id: string;
    reason: string;
    language: Language;
  }) {
    const t = sellerMessages[language];
    try {
      await this.assertAdminCan({
        adminId,
        permission: AdminPermission.MANAGE_USERS,
        t,
      });

      const rejectionReason = reason.trim();
      if (rejectionReason.length < REJECTION_REASON_MIN_LENGTH) {
        throw new BadRequestError(t.rejectionReasonTooShort);
      }

      const profile = await this.findBusinessForReview({ id, t });
      if (profile.approvalStatus !== BusinessApprovalStatus.PENDING) {
        throw new BadRequestError(t.businessNotPending);
      }

      const updated = await this.prisma.$transaction(async (tx) => {
        await tx.businessProfile.update({
          where: { sellerId: id },
          data: {
            approvalStatus: BusinessApprovalStatus.REJECTED,
            reviewedAt: new Date(),
            reviewedById: adminId,
            rejectionReason,
          },
        });

        await tx.adminActivityLog.create({
          data: {
            adminId,
            action: 'REJECT_BUSINESS',
            entityType: 'Seller',
            entityId: id,
            changes: { approvalStatus: BusinessApprovalStatus.REJECTED },
            metadata: { reason: rejectionReason },
          },
        });

        return tx.seller.findUniqueOrThrow({
          where: { id },
          include: this.getSellerInclude(language),
        });
      });

      await this.mailService.sendBusinessRejectedEmail({
        email: updated.email,
        locale: updated.contentLanguage ?? undefined,
        data: { businessName: profile.businessName, reason: rejectionReason },
      });

      return { ...updated, country: this.mapCountry(updated.country) };
    } catch (error) {
      if (
        error instanceof UnAuthorizedError ||
        error instanceof NotFoundError ||
        error instanceof BadRequestError
      )
        throw error;
      this.logger.error(t.errorRejectBusiness, error);
      throw new InternalServerError(t.errorRejectBusiness);
    }
  }

  /** The business profile under review; NotFound, or BadRequest when not a business. */
  private async findBusinessForReview({
    id,
    t,
  }: {
    id: string;
    t: SellerMessages;
  }) {
    const seller = await this.prisma.seller.findUnique({
      where: { id },
      select: {
        businessProfile: {
          select: { businessName: true, approvalStatus: true },
        },
      },
    });
    if (!seller) throw new NotFoundError(t.sellerNotFound);
    if (!seller.businessProfile) throw new BadRequestError(t.notABusiness);
    return seller.businessProfile;
  }

  /**
   * Counts every still-open obligation tied to a seller — whether they act as
   * buyer/seller, payer/receiver, client/provider. All subgraphs share one
   * physical database, but `ekoru-users`' Prisma client only models the entities
   * it owns, so these cross-service tables (Order, Payment, Quotation, …) are
   * reached with a single parameterised raw query. Run it inside the caller's
   * transaction (pass `tx`) so the check and the follow-up action commit
   * atomically. Shared by two seller-lifecycle gates — an admin ban and a
   * seller's own account deletion — which both refuse while anything is open.
   *
   * "Open" definitions:
   *   • Order        — PENDING_PAYMENT, or PAID but not yet DELIVERED/RETURNED/CANCELED
   *   • Payment      — PENDING or PROCESSING
   *   • PaymentRefund— PENDING or PROCESSING
   *   • Quotation    — PENDING or ACCEPTED (agreed work not yet completed)
   *   • ServiceBooking — PENDING/CONFIRMED/IN_PROGRESS, or payment PENDING/PROCESSING
   *   • Exchange     — PENDING or ACCEPTED
   */
  async getPendingObligations({
    client,
    sellerId,
  }: {
    client: Prisma.TransactionClient | PrismaService;
    sellerId: string;
  }) {
    const [row] = await client.$queryRaw<
      Array<{
        orders: number;
        payments: number;
        refunds: number;
        quotations: number;
        bookings: number;
        exchanges: number;
      }>
    >`
      SELECT
        (SELECT COUNT(*)::int FROM "Order" o
           JOIN "ShippingStatus" s ON s.id = o."shippingStatusId"
          WHERE (o."buyerId" = ${sellerId} OR o."sellerId" = ${sellerId})
            AND (o.status = 'PENDING_PAYMENT'
                 OR (o.status = 'PAID'
                     AND s.status NOT IN ('DELIVERED', 'RETURNED', 'CANCELED')))
        ) AS "orders",
        (SELECT COUNT(*)::int FROM "Payment"
          WHERE ("payerId" = ${sellerId} OR "receiverId" = ${sellerId})
            AND status IN ('PENDING', 'PROCESSING')
        ) AS "payments",
        (SELECT COUNT(*)::int FROM "PaymentRefund" r
           JOIN "Payment" p ON p.id = r."paymentId"
          WHERE (p."payerId" = ${sellerId} OR p."receiverId" = ${sellerId})
            AND r.status IN ('PENDING', 'PROCESSING')
        ) AS "refunds",
        (SELECT COUNT(*)::int FROM "Quotation"
          WHERE ("clientId" = ${sellerId} OR "providerId" = ${sellerId})
            AND status IN ('PENDING', 'ACCEPTED')
        ) AS "quotations",
        (SELECT COUNT(*)::int FROM "ServiceBooking"
          WHERE ("clientId" = ${sellerId} OR "providerId" = ${sellerId})
            AND (status IN ('PENDING', 'CONFIRMED', 'IN_PROGRESS')
                 OR "paymentStatus" IN ('PENDING', 'PROCESSING'))
        ) AS "bookings",
        (SELECT COUNT(*)::int FROM "Exchange" e
           JOIN "Product" po ON po.id = e."offeredProductId"
           JOIN "Product" pr ON pr.id = e."requestedProductId"
          WHERE (po."sellerId" = ${sellerId} OR pr."sellerId" = ${sellerId})
            AND e.status IN ('PENDING', 'ACCEPTED')
        ) AS "exchanges"
    `;

    const obligations = {
      orders: row?.orders ?? 0,
      payments: row?.payments ?? 0,
      refunds: row?.refunds ?? 0,
      quotations: row?.quotations ?? 0,
      bookings: row?.bookings ?? 0,
      exchanges: row?.exchanges ?? 0,
    };
    const total = Object.values(obligations).reduce((a, b) => a + b, 0);

    return { obligations, total };
  }

  /**
   * Bans a seller. A ban is only allowed once the seller has zero open
   * obligations (orders, payments, refunds, quotations, bookings, exchanges) —
   * otherwise it is hard-blocked and the open counts are returned in the error.
   *
   * Performed atomically (Serializable) so nothing new can slip in between the
   * check and the ban. On success the seller is deactivated (`isActive=false`)
   * and unverified (`isVerified=false`), a `BannedSeller` history row is written,
   * all refresh tokens are revoked, membership auto-renewal is stopped, and the
   * action is audited. Requires BAN_USERS.
   */
  async banSeller({
    adminId,
    id,
    input,
    language,
  }: {
    adminId: string;
    id: string;
    input: BanSellerInput;
    language: Language;
  }) {
    const t = sellerMessages[language];
    try {
      await this.assertAdminCan({
        adminId,
        permission: AdminPermission.BAN_USERS,
        t,
      });

      const existing = await this.prisma.seller.findUnique({
        where: { id },
        select: { id: true },
      });

      if (!existing) {
        throw new NotFoundError(t.sellerNotFound);
      }

      const updated = await this.prisma.$transaction(
        async (tx) => {
          // Only one ban may be active at a time.
          const activeBan = await tx.bannedSeller.findFirst({
            where: { sellerId: id, isActive: true },
            select: { id: true },
          });
          if (activeBan) {
            throw new BadRequestError(t.sellerAlreadyBanned);
          }

          // Hard gate: refuse the ban while anything is still in flight.
          const { obligations, total } = await this.getPendingObligations({
            client: tx,
            sellerId: id,
          });
          if (total > 0) {
            throw new BadRequestError(t.sellerHasPendingObligations, {
              obligations,
            });
          }

          const seller = await tx.seller.update({
            where: { id },
            data: { isActive: false, isVerified: false },
            include: this.getSellerInclude(language),
          });

          const ban = await tx.bannedSeller.create({
            data: {
              sellerId: id,
              reasonCode: input.reasonCode,
              reason: input.reason,
              notes: input.notes ?? null,
              evidence: input.evidence ?? undefined,
              expiresAt: input.expiresAt ?? null,
              bannedById: adminId,
            },
            select: { id: true },
          });

          // Kill existing sessions. RefreshToken is owned by the gateway
          // subgraph, so it is reached via raw SQL on the shared database.
          await tx.$executeRaw`
            UPDATE "RefreshToken" SET "isRevoked" = true
            WHERE "userId" = ${id} AND "userType" = 'seller'
          `;

          // Stop billing: a banned account must never auto-renew a membership.
          await tx.personMembershipSubscription.updateMany({
            where: { sellerId: id, isActive: true },
            data: { isActive: false, autoRenew: false },
          });
          await tx.businessMembershipSubscription.updateMany({
            where: { sellerId: id, isActive: true },
            data: { isActive: false, autoRenew: false },
          });

          await tx.adminActivityLog.create({
            data: {
              adminId,
              action: 'BAN_SELLER',
              entityType: 'Seller',
              entityId: id,
              changes: { isActive: false, isVerified: false },
              metadata: {
                banId: ban.id,
                reasonCode: input.reasonCode,
                reason: input.reason,
                expiresAt: input.expiresAt
                  ? input.expiresAt.toISOString()
                  : null,
              },
            },
          });

          return seller;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );

      this.logger.warn(
        `Seller ${id} banned by admin ${adminId} — reason: ${input.reasonCode}`,
      );

      return { ...updated, country: this.mapCountry(updated.country) };
    } catch (error) {
      if (
        error instanceof UnAuthorizedError ||
        error instanceof NotFoundError ||
        error instanceof BadRequestError
      )
        throw error;
      this.logger.error(t.errorBanSeller, error);
      throw new InternalServerError(t.errorBanSeller);
    }
  }

  /**
   * Lifts the seller's currently-active ban: the `BannedSeller` row is closed
   * (isActive=false, unbannedAt/By recorded) and the seller is reactivated.
   * `isVerified` is intentionally NOT restored — verification must be re-earned
   * through admin review. Requires BAN_USERS.
   */
  async reinstateSeller({
    adminId,
    id,
    language,
    unbanReason,
  }: {
    adminId: string;
    id: string;
    language: Language;
    unbanReason?: string;
  }) {
    const t = sellerMessages[language];
    try {
      await this.assertAdminCan({
        adminId,
        permission: AdminPermission.BAN_USERS,
        t,
      });

      const existing = await this.prisma.seller.findUnique({
        where: { id },
        select: { id: true },
      });

      if (!existing) {
        throw new NotFoundError(t.sellerNotFound);
      }

      const activeBan = await this.prisma.bannedSeller.findFirst({
        where: { sellerId: id, isActive: true },
        orderBy: { bannedAt: 'desc' },
        select: { id: true },
      });

      if (!activeBan) {
        throw new BadRequestError(t.sellerNotBanned);
      }

      const updated = await this.prisma.$transaction(async (tx) => {
        await tx.bannedSeller.update({
          where: { id: activeBan.id },
          data: {
            isActive: false,
            unbannedAt: new Date(),
            unbannedById: adminId,
            unbanReason: unbanReason ?? null,
          },
        });

        const seller = await tx.seller.update({
          where: { id },
          data: { isActive: true },
          include: this.getSellerInclude(language),
        });

        await tx.adminActivityLog.create({
          data: {
            adminId,
            action: 'REINSTATE_SELLER',
            entityType: 'Seller',
            entityId: id,
            changes: { isActive: true },
            metadata: { banId: activeBan.id, unbanReason: unbanReason ?? null },
          },
        });

        return seller;
      });

      this.logger.warn(
        `Seller ${id} reinstated by admin ${adminId}` +
          (unbanReason ? ` — reason: ${unbanReason}` : ''),
      );

      return { ...updated, country: this.mapCountry(updated.country) };
    } catch (error) {
      if (
        error instanceof UnAuthorizedError ||
        error instanceof NotFoundError ||
        error instanceof BadRequestError
      )
        throw error;
      this.logger.error(t.errorReinstateSeller, error);
      throw new InternalServerError(t.errorReinstateSeller);
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
