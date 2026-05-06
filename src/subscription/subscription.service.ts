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
  CreatePersonMembershipSubscriptionInput,
  CreateBusinessMembershipSubscriptionInput,
  UpsertPersonMembershipTranslationInput,
  UpsertBusinessMembershipTranslationInput,
  UpsertPersonMembershipPricingInput,
  UpsertBusinessMembershipPricingInput,
} from './dto';

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(private readonly prisma: PrismaService) {}

  private personMembershipInclude(language: Language, countryId?: number) {
    return {
      translations: { where: { language } },
      pricing: countryId
        ? { where: { countryId, isActive: true } }
        : { where: { isActive: true } },
    };
  }

  private businessMembershipInclude(language: Language, countryId?: number) {
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

  // ─── Person Memberships ───────────────────────────────────────────────────────

  async getPersonMemberships(language: Language, countryId?: number) {
    const t = subscriptionMessages[language];
    try {
      const memberships = await this.prisma.personMembership.findMany({
        where: { isActive: true },
        include: this.personMembershipInclude(language, countryId),
        orderBy: { membershipType: 'asc' },
      });
      return memberships.map(this.mapPersonMembership);
    } catch (error) {
      this.logger.error(t.errorGetMemberships, error);
      throw new InternalServerError(t.errorGetMemberships);
    }
  }

  async getPersonMembershipById(
    id: number,
    language: Language,
    countryId?: number,
  ) {
    const t = subscriptionMessages[language];
    try {
      const membership = await this.prisma.personMembership.findUnique({
        where: { id },
        include: this.personMembershipInclude(language, countryId),
      });
      if (!membership) throw new NotFoundError(t.membershipNotFound);
      return this.mapPersonMembership(membership);
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      this.logger.error(t.errorGetMembership, error);
      throw new InternalServerError(t.errorGetMembership);
    }
  }

  async createPersonMembership(
    input: CreatePersonMembershipInput,
    adminId: string,
    language: Language,
  ) {
    const t = subscriptionMessages[language];
    try {
      if (!adminId) throw new UnAuthorizedError(t.unauthorized);
      const membership = await this.prisma.personMembership.create({
        data: {
          membershipType: input.membershipType,
          durationMonths: input.durationMonths,
        },
        include: this.personMembershipInclude(language),
      });
      return this.mapPersonMembership(membership);
    } catch (error) {
      if (error instanceof UnAuthorizedError) throw error;
      this.logger.error(t.errorCreateMembership, error);
      throw new InternalServerError(t.errorCreateMembership);
    }
  }

  async upsertPersonMembershipTranslation(
    input: UpsertPersonMembershipTranslationInput,
    adminId: string,
    language: Language,
  ) {
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

  async upsertPersonMembershipPricing(
    input: UpsertPersonMembershipPricingInput,
    adminId: string,
    language: Language,
  ) {
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

  async assignPersonMembership(
    sellerId: string,
    input: CreatePersonMembershipSubscriptionInput,
    language: Language,
  ) {
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

  async getBusinessMemberships(language: Language, countryId?: number) {
    const t = subscriptionMessages[language];
    try {
      const memberships = await this.prisma.businessMembership.findMany({
        where: { isActive: true },
        include: this.businessMembershipInclude(language, countryId),
        orderBy: { membershipType: 'asc' },
      });
      return memberships.map(this.mapBusinessMembership);
    } catch (error) {
      this.logger.error(t.errorGetMemberships, error);
      throw new InternalServerError(t.errorGetMemberships);
    }
  }

  async getBusinessMembershipById(
    id: number,
    language: Language,
    countryId?: number,
  ) {
    const t = subscriptionMessages[language];
    try {
      const membership = await this.prisma.businessMembership.findUnique({
        where: { id },
        include: this.businessMembershipInclude(language, countryId),
      });
      if (!membership) throw new NotFoundError(t.membershipNotFound);
      return this.mapBusinessMembership(membership);
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      this.logger.error(t.errorGetMembership, error);
      throw new InternalServerError(t.errorGetMembership);
    }
  }

  async createBusinessMembership(
    input: CreateBusinessMembershipInput,
    adminId: string,
    language: Language,
  ) {
    const t = subscriptionMessages[language];
    try {
      if (!adminId) throw new UnAuthorizedError(t.unauthorized);
      const membership = await this.prisma.businessMembership.create({
        data: {
          membershipType: input.membershipType,
          durationMonths: input.durationMonths,
        },
        include: this.businessMembershipInclude(language),
      });
      return this.mapBusinessMembership(membership);
    } catch (error) {
      if (error instanceof UnAuthorizedError) throw error;
      this.logger.error(t.errorCreateMembership, error);
      throw new InternalServerError(t.errorCreateMembership);
    }
  }

  async upsertBusinessMembershipTranslation(
    input: UpsertBusinessMembershipTranslationInput,
    adminId: string,
    language: Language,
  ) {
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

  async upsertBusinessMembershipPricing(
    input: UpsertBusinessMembershipPricingInput,
    adminId: string,
    language: Language,
  ) {
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

  async assignBusinessMembership(
    sellerId: string,
    input: CreateBusinessMembershipSubscriptionInput,
    language: Language,
  ) {
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
}
