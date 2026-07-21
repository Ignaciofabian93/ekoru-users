import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  UnAuthorizedError,
  NotFoundError,
  InternalServerError,
} from '../common/exceptions';
import { Language } from '../graphql/enums';
import { subscriptionMessages } from './subscription.i18n';
import {
  CreatePersonMembershipInput,
  CreateBusinessMembershipInput,
  UpdatePersonMembershipInput,
  UpdateBusinessMembershipInput,
  CreatePersonMembershipSubscriptionInput,
  CreateBusinessMembershipSubscriptionInput,
  UpsertPersonMembershipTranslationInput,
  UpsertBusinessMembershipTranslationInput,
  UpsertPersonMembershipPricingInput,
  UpsertBusinessMembershipPricingInput,
  PersonMembershipUpsertRowInput,
  PersonMembershipTranslationUpsertRowInput,
  PersonMembershipPricingUpsertRowInput,
  BusinessMembershipUpsertRowInput,
  BusinessMembershipTranslationUpsertRowInput,
  BusinessMembershipPricingUpsertRowInput,
} from './dto';
import {
  pickDefined,
  requireBulkFields,
  processBulkRows,
} from '../common/bulk';
import {
  calculatePrismaParams,
  createPaginatedResponse,
} from '../utils/pagination';

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(private readonly prisma: PrismaService) {}

  private personMembershipInclude({
    language,
    countryId,
  }: {
    language: Language;
    countryId?: number;
  }) {
    return {
      translations: { where: { language } },
      pricing: countryId
        ? { where: { countryId, isActive: true } }
        : { where: { isActive: true } },
    };
  }

  private businessMembershipInclude({
    language,
    countryId,
  }: {
    language: Language;
    countryId?: number;
  }) {
    return {
      translations: { where: { language } },
      pricing: countryId
        ? { where: { countryId, isActive: true } }
        : { where: { isActive: true } },
    };
  }

  private mapPersonMembership(m: any) {
    const { translations, pricing, ...rest } = m;
    return {
      ...rest,
      translation: translations?.[0] ?? null,
      pricing: pricing?.[0] ?? null,
    };
  }

  private mapBusinessMembership(m: any) {
    const { translations, pricing, ...rest } = m;
    return {
      ...rest,
      translation: translations?.[0] ?? null,
      pricing: pricing?.[0] ?? null,
    };
  }

  // ─── Raw admin-panel reads (Admin only) ──────────────────────────────────────
  // Return membership translation/pricing rows exactly as stored so the admin
  // panel can edit every language and per-country price directly.

  async getRawPersonMembershipTranslations({
    adminId,
    language,
    personMembershipId,
    page = 1,
    pageSize = 10,
  }: {
    adminId: string;
    language: Language;
    personMembershipId?: number;
    page?: number;
    pageSize?: number;
  }) {
    const t = subscriptionMessages[language];
    try {
      if (!adminId) {
        throw new UnAuthorizedError(t.unauthorized);
      }

      const where = personMembershipId ? { personMembershipId } : {};
      const { skip, take } = calculatePrismaParams(page, pageSize);

      const [count, translations] = await Promise.all([
        this.prisma.personMembershipTranslation.count({ where }),
        this.prisma.personMembershipTranslation.findMany({
          where,
          skip,
          take,
          orderBy: { id: 'asc' },
        }),
      ]);

      return createPaginatedResponse(translations, count, page, pageSize);
    } catch (error) {
      if (error instanceof UnAuthorizedError) throw error;
      this.logger.error(t.errorGetMemberships, error);
      throw new InternalServerError(t.errorGetMemberships);
    }
  }

  async getRawBusinessMembershipTranslations({
    adminId,
    language,
    businessMembershipId,
    page = 1,
    pageSize = 10,
  }: {
    adminId: string;
    language: Language;
    businessMembershipId?: number;
    page?: number;
    pageSize?: number;
  }) {
    const t = subscriptionMessages[language];
    try {
      if (!adminId) {
        throw new UnAuthorizedError(t.unauthorized);
      }

      const where = businessMembershipId ? { businessMembershipId } : {};
      const { skip, take } = calculatePrismaParams(page, pageSize);

      const [count, translations] = await Promise.all([
        this.prisma.businessMembershipTranslation.count({ where }),
        this.prisma.businessMembershipTranslation.findMany({
          where,
          skip,
          take,
          orderBy: { id: 'asc' },
        }),
      ]);

      return createPaginatedResponse(translations, count, page, pageSize);
    } catch (error) {
      if (error instanceof UnAuthorizedError) throw error;
      this.logger.error(t.errorGetMemberships, error);
      throw new InternalServerError(t.errorGetMemberships);
    }
  }

  async getRawPersonMembershipPricing({
    adminId,
    language,
    personMembershipId,
    countryId,
    page = 1,
    pageSize = 10,
  }: {
    adminId: string;
    language: Language;
    personMembershipId?: number;
    countryId?: number;
    page?: number;
    pageSize?: number;
  }) {
    const t = subscriptionMessages[language];
    try {
      if (!adminId) {
        throw new UnAuthorizedError(t.unauthorized);
      }

      const where = {
        ...(personMembershipId ? { personMembershipId } : {}),
        ...(countryId ? { countryId } : {}),
      };
      const { skip, take } = calculatePrismaParams(page, pageSize);

      const [count, pricing] = await Promise.all([
        this.prisma.personMembershipPricing.count({ where }),
        this.prisma.personMembershipPricing.findMany({
          where,
          skip,
          take,
          orderBy: { id: 'asc' },
        }),
      ]);

      return createPaginatedResponse(pricing, count, page, pageSize);
    } catch (error) {
      if (error instanceof UnAuthorizedError) throw error;
      this.logger.error(t.errorGetMemberships, error);
      throw new InternalServerError(t.errorGetMemberships);
    }
  }

  async getRawBusinessMembershipPricing({
    adminId,
    language,
    businessMembershipId,
    countryId,
    page = 1,
    pageSize = 10,
  }: {
    adminId: string;
    language: Language;
    businessMembershipId?: number;
    countryId?: number;
    page?: number;
    pageSize?: number;
  }) {
    const t = subscriptionMessages[language];
    try {
      if (!adminId) {
        throw new UnAuthorizedError(t.unauthorized);
      }

      const where = {
        ...(businessMembershipId ? { businessMembershipId } : {}),
        ...(countryId ? { countryId } : {}),
      };
      const { skip, take } = calculatePrismaParams(page, pageSize);

      const [count, pricing] = await Promise.all([
        this.prisma.businessMembershipPricing.count({ where }),
        this.prisma.businessMembershipPricing.findMany({
          where,
          skip,
          take,
          orderBy: { id: 'asc' },
        }),
      ]);

      return createPaginatedResponse(pricing, count, page, pageSize);
    } catch (error) {
      if (error instanceof UnAuthorizedError) throw error;
      this.logger.error(t.errorGetMemberships, error);
      throw new InternalServerError(t.errorGetMemberships);
    }
  }

  // ─── Person Memberships ───────────────────────────────────────────────────────

  async getPersonMemberships({
    language,
    countryId,
  }: {
    language: Language;
    countryId?: number;
  }) {
    const t = subscriptionMessages[language];
    try {
      const memberships = await this.prisma.personMembership.findMany({
        where: { isActive: true },
        include: this.personMembershipInclude({ language, countryId }),
        orderBy: { membershipType: 'asc' },
      });
      return memberships.map(this.mapPersonMembership);
    } catch (error) {
      this.logger.error(t.errorGetMemberships, error);
      throw new InternalServerError(t.errorGetMemberships);
    }
  }

  async getPersonMembershipById({
    id,
    language,
    countryId,
  }: {
    id: number;
    language: Language;
    countryId?: number;
  }) {
    const t = subscriptionMessages[language];
    try {
      const membership = await this.prisma.personMembership.findUnique({
        where: { id },
        include: this.personMembershipInclude({ language, countryId }),
      });
      if (!membership) throw new NotFoundError(t.membershipNotFound);
      return this.mapPersonMembership(membership);
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      this.logger.error(t.errorGetMembership, error);
      throw new InternalServerError(t.errorGetMembership);
    }
  }

  async createPersonMembership({
    input,
    adminId,
    language,
  }: {
    input: CreatePersonMembershipInput;
    adminId: string;
    language: Language;
  }) {
    const t = subscriptionMessages[language];
    try {
      if (!adminId) throw new UnAuthorizedError(t.unauthorized);
      const membership = await this.prisma.personMembership.create({
        data: {
          membershipType: input.membershipType,
          durationMonths: input.durationMonths,
        },
        include: this.personMembershipInclude({ language }),
      });
      return this.mapPersonMembership(membership);
    } catch (error) {
      if (error instanceof UnAuthorizedError) throw error;
      this.logger.error(t.errorCreateMembership, error);
      throw new InternalServerError(t.errorCreateMembership);
    }
  }

  async updatePersonMembership({
    id,
    input,
    adminId,
    language,
  }: {
    id: number;
    input: UpdatePersonMembershipInput;
    adminId: string;
    language: Language;
  }) {
    const t = subscriptionMessages[language];
    try {
      if (!adminId) throw new UnAuthorizedError(t.unauthorized);

      const existing = await this.prisma.personMembership.findUnique({
        where: { id },
      });
      if (!existing) throw new NotFoundError(t.membershipNotFound);

      const membership = await this.prisma.personMembership.update({
        where: { id },
        data: {
          ...(input.membershipType !== undefined && {
            membershipType: input.membershipType,
          }),
          ...(input.durationMonths !== undefined && {
            durationMonths: input.durationMonths,
          }),
          ...(input.isActive !== undefined && { isActive: input.isActive }),
        },
        include: this.personMembershipInclude({ language }),
      });
      return this.mapPersonMembership(membership);
    } catch (error) {
      if (
        error instanceof UnAuthorizedError ||
        error instanceof NotFoundError
      ) {
        throw error;
      }
      this.logger.error(t.errorUpdateMembership, error);
      throw new InternalServerError(t.errorUpdateMembership);
    }
  }

  /**
   * Soft delete: deactivates the plan (isActive = false) instead of removing it,
   * so existing subscriptions and history stay intact. Deactivated plans are
   * excluded from the public listings; reactivate via updatePersonMembership.
   */
  async deletePersonMembership({
    id,
    adminId,
    language,
  }: {
    id: number;
    adminId: string;
    language: Language;
  }) {
    const t = subscriptionMessages[language];
    try {
      if (!adminId) throw new UnAuthorizedError(t.unauthorized);

      const existing = await this.prisma.personMembership.findUnique({
        where: { id },
      });
      if (!existing) throw new NotFoundError(t.membershipNotFound);

      const membership = await this.prisma.personMembership.update({
        where: { id },
        data: { isActive: false },
        include: this.personMembershipInclude({ language }),
      });
      return this.mapPersonMembership(membership);
    } catch (error) {
      if (
        error instanceof UnAuthorizedError ||
        error instanceof NotFoundError
      ) {
        throw error;
      }
      this.logger.error(t.errorDeleteMembership, error);
      throw new InternalServerError(t.errorDeleteMembership);
    }
  }

  async upsertPersonMembershipTranslation({
    input,
    adminId,
    language,
  }: {
    input: UpsertPersonMembershipTranslationInput;
    adminId: string;
    language: Language;
  }) {
    const t = subscriptionMessages[language];
    try {
      if (!adminId) throw new UnAuthorizedError(t.unauthorized);
      return await this.prisma.personMembershipTranslation.upsert({
        where: {
          personMembershipId_language: {
            personMembershipId: input.personMembershipId,
            language: input.language,
          },
        },
        update: { name: input.name, description: input.description },
        create: {
          personMembershipId: input.personMembershipId,
          language: input.language,
          name: input.name,
          description: input.description,
        },
      });
    } catch (error) {
      if (error instanceof UnAuthorizedError) throw error;
      this.logger.error(t.errorUpsertTranslation, error);
      throw new InternalServerError(t.errorUpsertTranslation);
    }
  }

  async deletePersonMembershipTranslation({
    personMembershipId,
    translationLanguage,
    adminId,
    language,
  }: {
    personMembershipId: number;
    translationLanguage: Language;
    adminId: string;
    language: Language;
  }) {
    const t = subscriptionMessages[language];
    try {
      if (!adminId) throw new UnAuthorizedError(t.unauthorized);

      const existing = await this.prisma.personMembershipTranslation.findUnique(
        {
          where: {
            personMembershipId_language: {
              personMembershipId,
              language: translationLanguage,
            },
          },
        },
      );
      if (!existing) throw new NotFoundError(t.translationNotFound);

      return await this.prisma.personMembershipTranslation.delete({
        where: {
          personMembershipId_language: {
            personMembershipId,
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
      this.logger.error(t.errorDeleteTranslation, error);
      throw new InternalServerError(t.errorDeleteTranslation);
    }
  }

  async upsertPersonMembershipPricing({
    input,
    adminId,
    language,
  }: {
    input: UpsertPersonMembershipPricingInput;
    adminId: string;
    language: Language;
  }) {
    const t = subscriptionMessages[language];
    try {
      if (!adminId) throw new UnAuthorizedError(t.unauthorized);
      return await this.prisma.personMembershipPricing.upsert({
        where: {
          personMembershipId_countryId: {
            personMembershipId: input.personMembershipId,
            countryId: input.countryId,
          },
        },
        update: {
          currency: input.currency,
          price: input.price,
          isActive: input.isActive ?? true,
        },
        create: {
          personMembershipId: input.personMembershipId,
          countryId: input.countryId,
          currency: input.currency,
          price: input.price,
          isActive: input.isActive ?? true,
        },
      });
    } catch (error) {
      if (error instanceof UnAuthorizedError) throw error;
      this.logger.error(t.errorUpsertPricing, error);
      throw new InternalServerError(t.errorUpsertPricing);
    }
  }

  async deletePersonMembershipPricing({
    personMembershipId,
    countryId,
    adminId,
    language,
  }: {
    personMembershipId: number;
    countryId: number;
    adminId: string;
    language: Language;
  }) {
    const t = subscriptionMessages[language];
    try {
      if (!adminId) throw new UnAuthorizedError(t.unauthorized);

      const existing = await this.prisma.personMembershipPricing.findUnique({
        where: {
          personMembershipId_countryId: { personMembershipId, countryId },
        },
      });
      if (!existing) throw new NotFoundError(t.pricingNotFound);

      return await this.prisma.personMembershipPricing.delete({
        where: {
          personMembershipId_countryId: { personMembershipId, countryId },
        },
      });
    } catch (error) {
      if (
        error instanceof UnAuthorizedError ||
        error instanceof NotFoundError
      ) {
        throw error;
      }
      this.logger.error(t.errorDeletePricing, error);
      throw new InternalServerError(t.errorDeletePricing);
    }
  }

  async assignPersonMembership({
    sellerId,
    input,
    language,
  }: {
    sellerId: string;
    input: CreatePersonMembershipSubscriptionInput;
    language: Language;
  }) {
    const t = subscriptionMessages[language];
    try {
      if (!sellerId) throw new UnAuthorizedError(t.unauthorized);

      const plan = await this.prisma.personMembership.findUnique({
        where: { id: input.personMembershipId, isActive: true },
      });
      if (!plan) throw new NotFoundError(t.membershipNotFound);

      const startDate = new Date();
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + plan.durationMonths);

      const subscription =
        await this.prisma.personMembershipSubscription.create({
          data: {
            sellerId,
            personMembershipId: input.personMembershipId,
            startDate,
            endDate,
            autoRenew: input.autoRenew ?? false,
            paymentId: input.paymentId,
          },
        });

      await this.prisma.personProfile.update({
        where: { sellerId },
        data: { personMembershipSubscriptionId: subscription.id },
      });

      return subscription;
    } catch (error) {
      if (
        error instanceof UnAuthorizedError ||
        error instanceof NotFoundError
      ) {
        throw error;
      }
      this.logger.error(t.errorAssignMembership, error);
      throw new InternalServerError(t.errorAssignMembership);
    }
  }

  // ─── Business Memberships ─────────────────────────────────────────────────────

  async getBusinessMemberships({
    language,
    countryId,
  }: {
    language: Language;
    countryId?: number;
  }) {
    const t = subscriptionMessages[language];
    try {
      const memberships = await this.prisma.businessMembership.findMany({
        where: { isActive: true },
        include: this.businessMembershipInclude({ language, countryId }),
        orderBy: { membershipType: 'asc' },
      });
      return memberships.map(this.mapBusinessMembership);
    } catch (error) {
      this.logger.error(t.errorGetMemberships, error);
      throw new InternalServerError(t.errorGetMemberships);
    }
  }

  async getBusinessMembershipById({
    id,
    language,
    countryId,
  }: {
    id: number;
    language: Language;
    countryId?: number;
  }) {
    const t = subscriptionMessages[language];
    try {
      const membership = await this.prisma.businessMembership.findUnique({
        where: { id },
        include: this.businessMembershipInclude({ language, countryId }),
      });
      if (!membership) throw new NotFoundError(t.membershipNotFound);
      return this.mapBusinessMembership(membership);
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      this.logger.error(t.errorGetMembership, error);
      throw new InternalServerError(t.errorGetMembership);
    }
  }

  async createBusinessMembership({
    input,
    adminId,
    language,
  }: {
    input: CreateBusinessMembershipInput;
    adminId: string;
    language: Language;
  }) {
    const t = subscriptionMessages[language];
    try {
      if (!adminId) throw new UnAuthorizedError(t.unauthorized);
      const membership = await this.prisma.businessMembership.create({
        data: {
          membershipType: input.membershipType,
          durationMonths: input.durationMonths,
        },
        include: this.businessMembershipInclude({ language }),
      });
      return this.mapBusinessMembership(membership);
    } catch (error) {
      if (error instanceof UnAuthorizedError) throw error;
      this.logger.error(t.errorCreateMembership, error);
      throw new InternalServerError(t.errorCreateMembership);
    }
  }

  async updateBusinessMembership({
    id,
    input,
    adminId,
    language,
  }: {
    id: number;
    input: UpdateBusinessMembershipInput;
    adminId: string;
    language: Language;
  }) {
    const t = subscriptionMessages[language];
    try {
      if (!adminId) throw new UnAuthorizedError(t.unauthorized);

      const existing = await this.prisma.businessMembership.findUnique({
        where: { id },
      });
      if (!existing) throw new NotFoundError(t.membershipNotFound);

      const membership = await this.prisma.businessMembership.update({
        where: { id },
        data: {
          ...(input.membershipType !== undefined && {
            membershipType: input.membershipType,
          }),
          ...(input.durationMonths !== undefined && {
            durationMonths: input.durationMonths,
          }),
          ...(input.isActive !== undefined && { isActive: input.isActive }),
        },
        include: this.businessMembershipInclude({ language }),
      });
      return this.mapBusinessMembership(membership);
    } catch (error) {
      if (
        error instanceof UnAuthorizedError ||
        error instanceof NotFoundError
      ) {
        throw error;
      }
      this.logger.error(t.errorUpdateMembership, error);
      throw new InternalServerError(t.errorUpdateMembership);
    }
  }

  /**
   * Soft delete: deactivates the plan (isActive = false) instead of removing it,
   * so existing subscriptions and history stay intact. Deactivated plans are
   * excluded from the public listings; reactivate via updateBusinessMembership.
   */
  async deleteBusinessMembership({
    id,
    adminId,
    language,
  }: {
    id: number;
    adminId: string;
    language: Language;
  }) {
    const t = subscriptionMessages[language];
    try {
      if (!adminId) throw new UnAuthorizedError(t.unauthorized);

      const existing = await this.prisma.businessMembership.findUnique({
        where: { id },
      });
      if (!existing) throw new NotFoundError(t.membershipNotFound);

      const membership = await this.prisma.businessMembership.update({
        where: { id },
        data: { isActive: false },
        include: this.businessMembershipInclude({ language }),
      });
      return this.mapBusinessMembership(membership);
    } catch (error) {
      if (
        error instanceof UnAuthorizedError ||
        error instanceof NotFoundError
      ) {
        throw error;
      }
      this.logger.error(t.errorDeleteMembership, error);
      throw new InternalServerError(t.errorDeleteMembership);
    }
  }

  async upsertBusinessMembershipTranslation({
    input,
    adminId,
    language,
  }: {
    input: UpsertBusinessMembershipTranslationInput;
    adminId: string;
    language: Language;
  }) {
    const t = subscriptionMessages[language];
    try {
      if (!adminId) throw new UnAuthorizedError(t.unauthorized);
      return await this.prisma.businessMembershipTranslation.upsert({
        where: {
          businessMembershipId_language: {
            businessMembershipId: input.businessMembershipId,
            language: input.language,
          },
        },
        update: { name: input.name, description: input.description },
        create: {
          businessMembershipId: input.businessMembershipId,
          language: input.language,
          name: input.name,
          description: input.description,
        },
      });
    } catch (error) {
      if (error instanceof UnAuthorizedError) throw error;
      this.logger.error(t.errorUpsertTranslation, error);
      throw new InternalServerError(t.errorUpsertTranslation);
    }
  }

  async deleteBusinessMembershipTranslation({
    businessMembershipId,
    translationLanguage,
    adminId,
    language,
  }: {
    businessMembershipId: number;
    translationLanguage: Language;
    adminId: string;
    language: Language;
  }) {
    const t = subscriptionMessages[language];
    try {
      if (!adminId) throw new UnAuthorizedError(t.unauthorized);

      const existing =
        await this.prisma.businessMembershipTranslation.findUnique({
          where: {
            businessMembershipId_language: {
              businessMembershipId,
              language: translationLanguage,
            },
          },
        });
      if (!existing) throw new NotFoundError(t.translationNotFound);

      return await this.prisma.businessMembershipTranslation.delete({
        where: {
          businessMembershipId_language: {
            businessMembershipId,
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
      this.logger.error(t.errorDeleteTranslation, error);
      throw new InternalServerError(t.errorDeleteTranslation);
    }
  }

  async upsertBusinessMembershipPricing({
    input,
    adminId,
    language,
  }: {
    input: UpsertBusinessMembershipPricingInput;
    adminId: string;
    language: Language;
  }) {
    const t = subscriptionMessages[language];
    try {
      if (!adminId) throw new UnAuthorizedError(t.unauthorized);
      return await this.prisma.businessMembershipPricing.upsert({
        where: {
          businessMembershipId_countryId: {
            businessMembershipId: input.businessMembershipId,
            countryId: input.countryId,
          },
        },
        update: {
          currency: input.currency,
          price: input.price,
          isActive: input.isActive ?? true,
        },
        create: {
          businessMembershipId: input.businessMembershipId,
          countryId: input.countryId,
          currency: input.currency,
          price: input.price,
          isActive: input.isActive ?? true,
        },
      });
    } catch (error) {
      if (error instanceof UnAuthorizedError) throw error;
      this.logger.error(t.errorUpsertPricing, error);
      throw new InternalServerError(t.errorUpsertPricing);
    }
  }

  async deleteBusinessMembershipPricing({
    businessMembershipId,
    countryId,
    adminId,
    language,
  }: {
    businessMembershipId: number;
    countryId: number;
    adminId: string;
    language: Language;
  }) {
    const t = subscriptionMessages[language];
    try {
      if (!adminId) throw new UnAuthorizedError(t.unauthorized);

      const existing = await this.prisma.businessMembershipPricing.findUnique({
        where: {
          businessMembershipId_countryId: { businessMembershipId, countryId },
        },
      });
      if (!existing) throw new NotFoundError(t.pricingNotFound);

      return await this.prisma.businessMembershipPricing.delete({
        where: {
          businessMembershipId_countryId: { businessMembershipId, countryId },
        },
      });
    } catch (error) {
      if (
        error instanceof UnAuthorizedError ||
        error instanceof NotFoundError
      ) {
        throw error;
      }
      this.logger.error(t.errorDeletePricing, error);
      throw new InternalServerError(t.errorDeletePricing);
    }
  }

  async assignBusinessMembership({
    sellerId,
    input,
    language,
  }: {
    sellerId: string;
    input: CreateBusinessMembershipSubscriptionInput;
    language: Language;
  }) {
    const t = subscriptionMessages[language];
    try {
      if (!sellerId) throw new UnAuthorizedError(t.unauthorized);

      const plan = await this.prisma.businessMembership.findUnique({
        where: { id: input.businessMembershipId, isActive: true },
      });
      if (!plan) throw new NotFoundError(t.membershipNotFound);

      const startDate = new Date();
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + plan.durationMonths);

      const subscription =
        await this.prisma.businessMembershipSubscription.create({
          data: {
            sellerId,
            businessMembershipId: input.businessMembershipId,
            startDate,
            endDate,
            autoRenew: input.autoRenew ?? false,
            paymentId: input.paymentId,
          },
        });

      await this.prisma.businessProfile.update({
        where: { sellerId },
        data: { businessMembershipSubscriptionId: subscription.id },
      });

      return subscription;
    } catch (error) {
      if (
        error instanceof UnAuthorizedError ||
        error instanceof NotFoundError
      ) {
        throw error;
      }
      this.logger.error(t.errorAssignMembership, error);
      throw new InternalServerError(t.errorAssignMembership);
    }
  }

  // ─── Bulk upserts (admin panel XLSX import / row edits) ─────────────────────
  // Rows with an id update, rows without an id create; translation rows without
  // an id are matched by (membershipId, language), pricing rows by
  // (membershipId, countryId). Per-row failures are reported in `errors[]`.

  async bulkUpsertPersonMemberships({
    adminId,
    rows,
    language,
  }: {
    adminId: string;
    rows: PersonMembershipUpsertRowInput[];
    language: Language;
  }) {
    if (!adminId)
      throw new UnAuthorizedError(subscriptionMessages[language].unauthorized);

    return processBulkRows(this.logger, rows, async (row) => {
      const data = pickDefined({
        membershipType: row.membershipType,
        durationMonths: row.durationMonths,
        isActive: row.isActive,
      });
      if (row.id != null) {
        await this.prisma.personMembership.update({
          where: { id: row.id },
          data,
        });
        return { outcome: 'updated', id: row.id };
      }
      requireBulkFields(row, ['membershipType', 'durationMonths']);
      const created = await this.prisma.personMembership.create({
        data: {
          membershipType: row.membershipType!,
          durationMonths: row.durationMonths!,
          isActive: row.isActive ?? true,
        },
      });
      return { outcome: 'created', id: created.id };
    });
  }

  async bulkUpsertPersonMembershipTranslations({
    adminId,
    rows,
    language,
  }: {
    adminId: string;
    rows: PersonMembershipTranslationUpsertRowInput[];
    language: Language;
  }) {
    if (!adminId)
      throw new UnAuthorizedError(subscriptionMessages[language].unauthorized);

    return processBulkRows(this.logger, rows, async (row) => {
      const data = pickDefined({
        name: row.name,
        description: row.description,
      });
      if (row.id != null) {
        await this.prisma.personMembershipTranslation.update({
          where: { id: row.id },
          data,
        });
        return { outcome: 'updated', id: row.id };
      }
      const { personMembershipId, language: rowLanguage } = row;
      if (personMembershipId == null || !rowLanguage) {
        throw new Error(
          'personMembershipId and language are required when no id is provided',
        );
      }
      const existing = await this.prisma.personMembershipTranslation.findUnique(
        {
          where: {
            personMembershipId_language: {
              personMembershipId,
              language: rowLanguage,
            },
          },
          select: { id: true },
        },
      );
      if (existing) {
        await this.prisma.personMembershipTranslation.update({
          where: { id: existing.id },
          data,
        });
        return { outcome: 'updated', id: existing.id };
      }
      requireBulkFields(row, ['name']);
      const created = await this.prisma.personMembershipTranslation.create({
        data: {
          personMembershipId,
          language: rowLanguage,
          name: row.name!,
          description: row.description ?? [],
        },
      });
      return { outcome: 'created', id: created.id };
    });
  }

  async bulkUpsertPersonMembershipPricing({
    adminId,
    rows,
    language,
  }: {
    adminId: string;
    rows: PersonMembershipPricingUpsertRowInput[];
    language: Language;
  }) {
    if (!adminId)
      throw new UnAuthorizedError(subscriptionMessages[language].unauthorized);

    return processBulkRows(this.logger, rows, async (row) => {
      const data = pickDefined({
        currency: row.currency,
        price: row.price,
        isActive: row.isActive,
      });
      if (row.id != null) {
        await this.prisma.personMembershipPricing.update({
          where: { id: row.id },
          data,
        });
        return { outcome: 'updated', id: row.id };
      }
      const { personMembershipId, countryId } = row;
      if (personMembershipId == null || countryId == null) {
        throw new Error(
          'personMembershipId and countryId are required when no id is provided',
        );
      }
      const existing = await this.prisma.personMembershipPricing.findUnique({
        where: {
          personMembershipId_countryId: { personMembershipId, countryId },
        },
        select: { id: true },
      });
      if (existing) {
        await this.prisma.personMembershipPricing.update({
          where: { id: existing.id },
          data,
        });
        return { outcome: 'updated', id: existing.id };
      }
      requireBulkFields(row, ['currency', 'price']);
      const created = await this.prisma.personMembershipPricing.create({
        data: {
          personMembershipId,
          countryId,
          currency: row.currency!,
          price: row.price!,
          isActive: row.isActive ?? true,
        },
      });
      return { outcome: 'created', id: created.id };
    });
  }

  async bulkUpsertBusinessMemberships({
    adminId,
    rows,
    language,
  }: {
    adminId: string;
    rows: BusinessMembershipUpsertRowInput[];
    language: Language;
  }) {
    if (!adminId)
      throw new UnAuthorizedError(subscriptionMessages[language].unauthorized);

    return processBulkRows(this.logger, rows, async (row) => {
      const data = pickDefined({
        membershipType: row.membershipType,
        durationMonths: row.durationMonths,
        isActive: row.isActive,
      });
      if (row.id != null) {
        await this.prisma.businessMembership.update({
          where: { id: row.id },
          data,
        });
        return { outcome: 'updated', id: row.id };
      }
      requireBulkFields(row, ['membershipType', 'durationMonths']);
      const created = await this.prisma.businessMembership.create({
        data: {
          membershipType: row.membershipType!,
          durationMonths: row.durationMonths!,
          isActive: row.isActive ?? true,
        },
      });
      return { outcome: 'created', id: created.id };
    });
  }

  async bulkUpsertBusinessMembershipTranslations({
    adminId,
    rows,
    language,
  }: {
    adminId: string;
    rows: BusinessMembershipTranslationUpsertRowInput[];
    language: Language;
  }) {
    if (!adminId)
      throw new UnAuthorizedError(subscriptionMessages[language].unauthorized);

    return processBulkRows(this.logger, rows, async (row) => {
      const data = pickDefined({
        name: row.name,
        description: row.description,
      });
      if (row.id != null) {
        await this.prisma.businessMembershipTranslation.update({
          where: { id: row.id },
          data,
        });
        return { outcome: 'updated', id: row.id };
      }
      const { businessMembershipId, language: rowLanguage } = row;
      if (businessMembershipId == null || !rowLanguage) {
        throw new Error(
          'businessMembershipId and language are required when no id is provided',
        );
      }
      const existing =
        await this.prisma.businessMembershipTranslation.findUnique({
          where: {
            businessMembershipId_language: {
              businessMembershipId,
              language: rowLanguage,
            },
          },
          select: { id: true },
        });
      if (existing) {
        await this.prisma.businessMembershipTranslation.update({
          where: { id: existing.id },
          data,
        });
        return { outcome: 'updated', id: existing.id };
      }
      requireBulkFields(row, ['name']);
      const created = await this.prisma.businessMembershipTranslation.create({
        data: {
          businessMembershipId,
          language: rowLanguage,
          name: row.name!,
          description: row.description ?? [],
        },
      });
      return { outcome: 'created', id: created.id };
    });
  }

  async bulkUpsertBusinessMembershipPricing({
    adminId,
    rows,
    language,
  }: {
    adminId: string;
    rows: BusinessMembershipPricingUpsertRowInput[];
    language: Language;
  }) {
    if (!adminId)
      throw new UnAuthorizedError(subscriptionMessages[language].unauthorized);

    return processBulkRows(this.logger, rows, async (row) => {
      const data = pickDefined({
        currency: row.currency,
        price: row.price,
        isActive: row.isActive,
      });
      if (row.id != null) {
        await this.prisma.businessMembershipPricing.update({
          where: { id: row.id },
          data,
        });
        return { outcome: 'updated', id: row.id };
      }
      const { businessMembershipId, countryId } = row;
      if (businessMembershipId == null || countryId == null) {
        throw new Error(
          'businessMembershipId and countryId are required when no id is provided',
        );
      }
      const existing = await this.prisma.businessMembershipPricing.findUnique({
        where: {
          businessMembershipId_countryId: { businessMembershipId, countryId },
        },
        select: { id: true },
      });
      if (existing) {
        await this.prisma.businessMembershipPricing.update({
          where: { id: existing.id },
          data,
        });
        return { outcome: 'updated', id: existing.id };
      }
      requireBulkFields(row, ['currency', 'price']);
      const created = await this.prisma.businessMembershipPricing.create({
        data: {
          businessMembershipId,
          countryId,
          currency: row.currency!,
          price: row.price!,
          isActive: row.isActive ?? true,
        },
      });
      return { outcome: 'created', id: created.id };
    });
  }
}
