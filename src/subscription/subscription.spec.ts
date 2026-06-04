import { SubscriptionService } from './subscription.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  Language,
  PersonSubscriptionPlan,
  BusinessSubscriptionPlan,
} from '../graphql/enums';
import {
  NotFoundError,
  UnAuthorizedError,
  InternalServerError,
} from '../common/exceptions';

const mockPrisma = {
  personMembership: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  businessMembership: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  personMembershipTranslation: {
    upsert: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
  },
  businessMembershipTranslation: {
    upsert: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
  },
  personMembershipPricing: {
    upsert: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
  },
  businessMembershipPricing: {
    upsert: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
  },
  personMembershipSubscription: { create: jest.fn() },
  businessMembershipSubscription: { create: jest.fn() },
  personProfile: { update: jest.fn() },
  businessProfile: { update: jest.fn() },
};

const lang = Language.EN;
const adminId = 'admin-123';
const sellerId = 'seller-456';

const personMembershipRaw = {
  id: 1,
  membershipType: PersonSubscriptionPlan.BASIC,
  durationMonths: 12,
  autoRenew: false,
  isActive: true,
  translations: [{ id: 10, name: 'Basic', description: ['desc'] }],
  pricing: [
    { id: 20, price: 9.99, currency: 'USD', countryId: 1, isActive: true },
  ],
};

const businessMembershipRaw = {
  id: 2,
  membershipType: BusinessSubscriptionPlan.STARTUP,
  durationMonths: 6,
  autoRenew: true,
  isActive: true,
  translations: [{ id: 11, name: 'Startup', description: ['desc'] }],
  pricing: [
    { id: 21, price: 29.99, currency: 'USD', countryId: 1, isActive: true },
  ],
};

describe('SubscriptionService', () => {
  let service: SubscriptionService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SubscriptionService(mockPrisma as unknown as PrismaService);
  });

  // ─── Person Memberships ──────────────────────────────────────────────────────

  describe('getPersonMemberships', () => {
    it('returns mapped memberships', async () => {
      mockPrisma.personMembership.findMany.mockResolvedValue([
        personMembershipRaw,
      ]);

      const result = await service.getPersonMemberships(lang);

      expect(result).toHaveLength(1);
      expect(result[0].translation).toEqual(
        personMembershipRaw.translations[0],
      );
      expect(result[0].pricing).toEqual(personMembershipRaw.pricing[0]);
    });

    it('passes countryId to prisma include when provided', async () => {
      mockPrisma.personMembership.findMany.mockResolvedValue([]);

      await service.getPersonMemberships(lang, 5);

      const include =
        mockPrisma.personMembership.findMany.mock.calls[0][0].include;
      expect(include.pricing.where.countryId).toBe(5);
    });

    it('returns null translation and pricing when arrays are empty', async () => {
      mockPrisma.personMembership.findMany.mockResolvedValue([
        { ...personMembershipRaw, translations: [], pricing: [] },
      ]);

      const [result] = await service.getPersonMemberships(lang);
      expect(result.translation).toBeNull();
      expect(result.pricing).toBeNull();
    });

    it('throws InternalServerError on prisma failure', async () => {
      mockPrisma.personMembership.findMany.mockRejectedValue(
        new Error('db error'),
      );

      await expect(service.getPersonMemberships(lang)).rejects.toBeInstanceOf(
        InternalServerError,
      );
    });
  });

  describe('getPersonMembershipById', () => {
    it('returns mapped membership when found', async () => {
      mockPrisma.personMembership.findUnique.mockResolvedValue(
        personMembershipRaw,
      );

      const result = await service.getPersonMembershipById(1, lang);

      expect(result.id).toBe(1);
      expect(result.translation).toEqual(personMembershipRaw.translations[0]);
    });

    it('throws NotFoundError when membership does not exist', async () => {
      mockPrisma.personMembership.findUnique.mockResolvedValue(null);

      await expect(
        service.getPersonMembershipById(99, lang),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it('throws InternalServerError on unexpected prisma failure', async () => {
      mockPrisma.personMembership.findUnique.mockRejectedValue(
        new Error('db error'),
      );

      await expect(
        service.getPersonMembershipById(1, lang),
      ).rejects.toBeInstanceOf(InternalServerError);
    });

    it('re-throws NotFoundError without wrapping', async () => {
      mockPrisma.personMembership.findUnique.mockResolvedValue(null);

      const error = await service
        .getPersonMembershipById(99, lang)
        .catch((e) => e);
      expect(error).toBeInstanceOf(NotFoundError);
      expect(error.extensions.code).toBe('NOT_FOUND');
    });
  });

  describe('createPersonMembership', () => {
    const input = {
      membershipType: PersonSubscriptionPlan.BASIC,
      durationMonths: 12,
      autoRenew: true,
    };

    it('creates and returns mapped membership', async () => {
      mockPrisma.personMembership.create.mockResolvedValue(personMembershipRaw);

      const result = await service.createPersonMembership(input, adminId, lang);

      expect(mockPrisma.personMembership.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            membershipType: input.membershipType,
            durationMonths: 12,
          },
        }),
      );
      expect(result.id).toBe(1);
    });

    it('throws UnAuthorizedError when adminId is empty', async () => {
      await expect(
        service.createPersonMembership(input, '', lang),
      ).rejects.toBeInstanceOf(UnAuthorizedError);
      expect(mockPrisma.personMembership.create).not.toHaveBeenCalled();
    });

    it('throws InternalServerError on prisma failure', async () => {
      mockPrisma.personMembership.create.mockRejectedValue(
        new Error('db error'),
      );

      await expect(
        service.createPersonMembership(input, adminId, lang),
      ).rejects.toBeInstanceOf(InternalServerError);
    });
  });

  describe('updatePersonMembership', () => {
    const input = { durationMonths: 24, isActive: false };

    it('updates only provided fields and returns mapped membership', async () => {
      mockPrisma.personMembership.findUnique.mockResolvedValue(
        personMembershipRaw,
      );
      mockPrisma.personMembership.update.mockResolvedValue({
        ...personMembershipRaw,
        durationMonths: 24,
        isActive: false,
      });

      const result = await service.updatePersonMembership(
        1,
        input,
        adminId,
        lang,
      );

      expect(result.durationMonths).toBe(24);
      expect(mockPrisma.personMembership.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: { durationMonths: 24, isActive: false },
        }),
      );
    });

    it('throws UnAuthorizedError when adminId is empty', async () => {
      await expect(
        service.updatePersonMembership(1, input, '', lang),
      ).rejects.toBeInstanceOf(UnAuthorizedError);
      expect(mockPrisma.personMembership.update).not.toHaveBeenCalled();
    });

    it('throws NotFoundError when membership does not exist', async () => {
      mockPrisma.personMembership.findUnique.mockResolvedValue(null);

      await expect(
        service.updatePersonMembership(99, input, adminId, lang),
      ).rejects.toBeInstanceOf(NotFoundError);
      expect(mockPrisma.personMembership.update).not.toHaveBeenCalled();
    });

    it('throws InternalServerError on prisma failure', async () => {
      mockPrisma.personMembership.findUnique.mockResolvedValue(
        personMembershipRaw,
      );
      mockPrisma.personMembership.update.mockRejectedValue(
        new Error('db error'),
      );

      await expect(
        service.updatePersonMembership(1, input, adminId, lang),
      ).rejects.toBeInstanceOf(InternalServerError);
    });
  });

  describe('deletePersonMembership', () => {
    it('soft deletes by setting isActive=false and returns mapped membership', async () => {
      mockPrisma.personMembership.findUnique.mockResolvedValue(
        personMembershipRaw,
      );
      mockPrisma.personMembership.update.mockResolvedValue({
        ...personMembershipRaw,
        isActive: false,
      });

      const result = await service.deletePersonMembership(1, adminId, lang);

      expect(result.isActive).toBe(false);
      expect(mockPrisma.personMembership.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: { isActive: false },
        }),
      );
    });

    it('throws UnAuthorizedError when adminId is empty', async () => {
      await expect(
        service.deletePersonMembership(1, '', lang),
      ).rejects.toBeInstanceOf(UnAuthorizedError);
    });

    it('throws NotFoundError when membership does not exist', async () => {
      mockPrisma.personMembership.findUnique.mockResolvedValue(null);

      await expect(
        service.deletePersonMembership(99, adminId, lang),
      ).rejects.toBeInstanceOf(NotFoundError);
      expect(mockPrisma.personMembership.update).not.toHaveBeenCalled();
    });
  });

  describe('deletePersonMembershipTranslation', () => {
    it('deletes the translation by composite key and returns it', async () => {
      const translation = { id: 10, personMembershipId: 1, language: lang };
      mockPrisma.personMembershipTranslation.findUnique.mockResolvedValue(
        translation,
      );
      mockPrisma.personMembershipTranslation.delete.mockResolvedValue(
        translation,
      );

      const result = await service.deletePersonMembershipTranslation(
        1,
        lang,
        adminId,
        lang,
      );

      expect(result).toEqual(translation);
      expect(
        mockPrisma.personMembershipTranslation.delete,
      ).toHaveBeenCalledWith({
        where: {
          personMembershipId_language: {
            personMembershipId: 1,
            language: lang,
          },
        },
      });
    });

    it('throws UnAuthorizedError when adminId is empty', async () => {
      await expect(
        service.deletePersonMembershipTranslation(1, lang, '', lang),
      ).rejects.toBeInstanceOf(UnAuthorizedError);
    });

    it('throws NotFoundError when translation does not exist', async () => {
      mockPrisma.personMembershipTranslation.findUnique.mockResolvedValue(null);

      await expect(
        service.deletePersonMembershipTranslation(1, lang, adminId, lang),
      ).rejects.toBeInstanceOf(NotFoundError);
      expect(
        mockPrisma.personMembershipTranslation.delete,
      ).not.toHaveBeenCalled();
    });
  });

  describe('deletePersonMembershipPricing', () => {
    it('deletes the pricing by composite key and returns it', async () => {
      const pricing = { id: 20, personMembershipId: 1, countryId: 1 };
      mockPrisma.personMembershipPricing.findUnique.mockResolvedValue(pricing);
      mockPrisma.personMembershipPricing.delete.mockResolvedValue(pricing);

      const result = await service.deletePersonMembershipPricing(
        1,
        1,
        adminId,
        lang,
      );

      expect(result).toEqual(pricing);
      expect(mockPrisma.personMembershipPricing.delete).toHaveBeenCalledWith({
        where: {
          personMembershipId_countryId: { personMembershipId: 1, countryId: 1 },
        },
      });
    });

    it('throws UnAuthorizedError when adminId is empty', async () => {
      await expect(
        service.deletePersonMembershipPricing(1, 1, '', lang),
      ).rejects.toBeInstanceOf(UnAuthorizedError);
    });

    it('throws NotFoundError when pricing does not exist', async () => {
      mockPrisma.personMembershipPricing.findUnique.mockResolvedValue(null);

      await expect(
        service.deletePersonMembershipPricing(1, 1, adminId, lang),
      ).rejects.toBeInstanceOf(NotFoundError);
      expect(mockPrisma.personMembershipPricing.delete).not.toHaveBeenCalled();
    });
  });

  describe('upsertPersonMembershipTranslation', () => {
    const input = {
      personMembershipId: 1,
      language: Language.EN,
      name: 'Basic',
      description: ['A basic plan'],
    };

    it('upserts and returns translation', async () => {
      const translation = { id: 10, ...input };
      mockPrisma.personMembershipTranslation.upsert.mockResolvedValue(
        translation,
      );

      const result = await service.upsertPersonMembershipTranslation(
        input,
        adminId,
        lang,
      );

      expect(result).toEqual(translation);
      expect(
        mockPrisma.personMembershipTranslation.upsert,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            personMembershipId_language: {
              personMembershipId: 1,
              language: Language.EN,
            },
          },
          create: expect.objectContaining({ name: 'Basic' }),
          update: expect.objectContaining({ name: 'Basic' }),
        }),
      );
    });

    it('throws UnAuthorizedError when adminId is empty', async () => {
      await expect(
        service.upsertPersonMembershipTranslation(input, '', lang),
      ).rejects.toBeInstanceOf(UnAuthorizedError);
    });

    it('throws InternalServerError on prisma failure', async () => {
      mockPrisma.personMembershipTranslation.upsert.mockRejectedValue(
        new Error('db error'),
      );

      await expect(
        service.upsertPersonMembershipTranslation(input, adminId, lang),
      ).rejects.toBeInstanceOf(InternalServerError);
    });
  });

  describe('upsertPersonMembershipPricing', () => {
    const input = {
      personMembershipId: 1,
      countryId: 1,
      currency: 'USD',
      price: 9.99,
      isActive: true,
    };

    it('upserts and returns pricing', async () => {
      const pricing = { id: 20, ...input };
      mockPrisma.personMembershipPricing.upsert.mockResolvedValue(pricing);

      const result = await service.upsertPersonMembershipPricing(
        input,
        adminId,
        lang,
      );

      expect(result).toEqual(pricing);
      expect(mockPrisma.personMembershipPricing.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            personMembershipId_countryId: {
              personMembershipId: 1,
              countryId: 1,
            },
          },
        }),
      );
    });

    it('defaults isActive to true when not provided', async () => {
      mockPrisma.personMembershipPricing.upsert.mockResolvedValue({ id: 20 });

      await service.upsertPersonMembershipPricing(
        { personMembershipId: 1, countryId: 1, currency: 'USD', price: 9.99 },
        adminId,
        lang,
      );

      const call = mockPrisma.personMembershipPricing.upsert.mock.calls[0][0];
      expect(call.create.isActive).toBe(true);
      expect(call.update.isActive).toBe(true);
    });

    it('throws UnAuthorizedError when adminId is empty', async () => {
      await expect(
        service.upsertPersonMembershipPricing(input, '', lang),
      ).rejects.toBeInstanceOf(UnAuthorizedError);
    });

    it('throws InternalServerError on prisma failure', async () => {
      mockPrisma.personMembershipPricing.upsert.mockRejectedValue(
        new Error('db error'),
      );

      await expect(
        service.upsertPersonMembershipPricing(input, adminId, lang),
      ).rejects.toBeInstanceOf(InternalServerError);
    });
  });

  describe('assignPersonMembership', () => {
    const input = { personMembershipId: 1, autoRenew: false };
    const subscription = { id: 'sub-1', sellerId, personMembershipId: 1 };

    it('creates subscription and returns it', async () => {
      mockPrisma.personMembership.findUnique.mockResolvedValue(
        personMembershipRaw,
      );
      mockPrisma.personMembershipSubscription.create.mockResolvedValue(
        subscription,
      );
      mockPrisma.personProfile.update.mockResolvedValue({});

      const result = await service.assignPersonMembership(
        sellerId,
        input,
        lang,
      );

      expect(result).toEqual(subscription);
      expect(
        mockPrisma.personMembershipSubscription.create,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sellerId,
            personMembershipId: input.personMembershipId,
            autoRenew: false,
          }),
        }),
      );
      expect(mockPrisma.personProfile.update).toHaveBeenCalledWith({
        where: { sellerId },
        data: { personMembershipSubscriptionId: subscription.id },
      });
    });

    it('throws UnAuthorizedError when sellerId is empty', async () => {
      await expect(
        service.assignPersonMembership('', input, lang),
      ).rejects.toBeInstanceOf(UnAuthorizedError);
      expect(mockPrisma.personMembership.findUnique).not.toHaveBeenCalled();
    });

    it('throws NotFoundError when membership does not exist', async () => {
      mockPrisma.personMembership.findUnique.mockResolvedValue(null);

      await expect(
        service.assignPersonMembership(sellerId, input, lang),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it('throws InternalServerError when subscription create fails', async () => {
      mockPrisma.personMembership.findUnique.mockResolvedValue(
        personMembershipRaw,
      );
      mockPrisma.personMembershipSubscription.create.mockRejectedValue(
        new Error('db error'),
      );

      await expect(
        service.assignPersonMembership(sellerId, input, lang),
      ).rejects.toBeInstanceOf(InternalServerError);
    });
  });

  // ─── Business Memberships ────────────────────────────────────────────────────

  describe('getBusinessMemberships', () => {
    it('returns mapped memberships', async () => {
      mockPrisma.businessMembership.findMany.mockResolvedValue([
        businessMembershipRaw,
      ]);

      const result = await service.getBusinessMemberships(lang);

      expect(result).toHaveLength(1);
      expect(result[0].translation).toEqual(
        businessMembershipRaw.translations[0],
      );
      expect(result[0].pricing).toEqual(businessMembershipRaw.pricing[0]);
    });

    it('passes countryId to prisma include when provided', async () => {
      mockPrisma.businessMembership.findMany.mockResolvedValue([]);

      await service.getBusinessMemberships(lang, 7);

      const include =
        mockPrisma.businessMembership.findMany.mock.calls[0][0].include;
      expect(include.pricing.where.countryId).toBe(7);
    });

    it('throws InternalServerError on prisma failure', async () => {
      mockPrisma.businessMembership.findMany.mockRejectedValue(
        new Error('db error'),
      );

      await expect(service.getBusinessMemberships(lang)).rejects.toBeInstanceOf(
        InternalServerError,
      );
    });
  });

  describe('getBusinessMembershipById', () => {
    it('returns mapped membership when found', async () => {
      mockPrisma.businessMembership.findUnique.mockResolvedValue(
        businessMembershipRaw,
      );

      const result = await service.getBusinessMembershipById(2, lang);

      expect(result.id).toBe(2);
      expect(result.translation).toEqual(businessMembershipRaw.translations[0]);
    });

    it('throws NotFoundError when membership does not exist', async () => {
      mockPrisma.businessMembership.findUnique.mockResolvedValue(null);

      await expect(
        service.getBusinessMembershipById(99, lang),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it('throws InternalServerError on unexpected prisma failure', async () => {
      mockPrisma.businessMembership.findUnique.mockRejectedValue(
        new Error('db error'),
      );

      await expect(
        service.getBusinessMembershipById(2, lang),
      ).rejects.toBeInstanceOf(InternalServerError);
    });
  });

  describe('createBusinessMembership', () => {
    const input = {
      membershipType: BusinessSubscriptionPlan.STARTUP,
      durationMonths: 6,
      autoRenew: false,
    };

    it('creates and returns mapped membership', async () => {
      mockPrisma.businessMembership.create.mockResolvedValue(
        businessMembershipRaw,
      );

      const result = await service.createBusinessMembership(
        input,
        adminId,
        lang,
      );

      expect(result.id).toBe(2);
      expect(mockPrisma.businessMembership.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            membershipType: input.membershipType,
            durationMonths: 6,
          },
        }),
      );
    });

    it('throws UnAuthorizedError when adminId is empty', async () => {
      await expect(
        service.createBusinessMembership(input, '', lang),
      ).rejects.toBeInstanceOf(UnAuthorizedError);
    });

    it('throws InternalServerError on prisma failure', async () => {
      mockPrisma.businessMembership.create.mockRejectedValue(
        new Error('db error'),
      );

      await expect(
        service.createBusinessMembership(input, adminId, lang),
      ).rejects.toBeInstanceOf(InternalServerError);
    });
  });

  describe('updateBusinessMembership', () => {
    const input = { durationMonths: 3, isActive: false };

    it('updates only provided fields and returns mapped membership', async () => {
      mockPrisma.businessMembership.findUnique.mockResolvedValue(
        businessMembershipRaw,
      );
      mockPrisma.businessMembership.update.mockResolvedValue({
        ...businessMembershipRaw,
        durationMonths: 3,
        isActive: false,
      });

      const result = await service.updateBusinessMembership(
        2,
        input,
        adminId,
        lang,
      );

      expect(result.durationMonths).toBe(3);
      expect(mockPrisma.businessMembership.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 2 },
          data: { durationMonths: 3, isActive: false },
        }),
      );
    });

    it('throws UnAuthorizedError when adminId is empty', async () => {
      await expect(
        service.updateBusinessMembership(2, input, '', lang),
      ).rejects.toBeInstanceOf(UnAuthorizedError);
    });

    it('throws NotFoundError when membership does not exist', async () => {
      mockPrisma.businessMembership.findUnique.mockResolvedValue(null);

      await expect(
        service.updateBusinessMembership(99, input, adminId, lang),
      ).rejects.toBeInstanceOf(NotFoundError);
      expect(mockPrisma.businessMembership.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteBusinessMembership', () => {
    it('soft deletes by setting isActive=false and returns mapped membership', async () => {
      mockPrisma.businessMembership.findUnique.mockResolvedValue(
        businessMembershipRaw,
      );
      mockPrisma.businessMembership.update.mockResolvedValue({
        ...businessMembershipRaw,
        isActive: false,
      });

      const result = await service.deleteBusinessMembership(2, adminId, lang);

      expect(result.isActive).toBe(false);
      expect(mockPrisma.businessMembership.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 2 },
          data: { isActive: false },
        }),
      );
    });

    it('throws NotFoundError when membership does not exist', async () => {
      mockPrisma.businessMembership.findUnique.mockResolvedValue(null);

      await expect(
        service.deleteBusinessMembership(99, adminId, lang),
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('deleteBusinessMembershipTranslation', () => {
    it('deletes the translation by composite key and returns it', async () => {
      const translation = { id: 11, businessMembershipId: 2, language: lang };
      mockPrisma.businessMembershipTranslation.findUnique.mockResolvedValue(
        translation,
      );
      mockPrisma.businessMembershipTranslation.delete.mockResolvedValue(
        translation,
      );

      const result = await service.deleteBusinessMembershipTranslation(
        2,
        lang,
        adminId,
        lang,
      );

      expect(result).toEqual(translation);
      expect(
        mockPrisma.businessMembershipTranslation.delete,
      ).toHaveBeenCalledWith({
        where: {
          businessMembershipId_language: {
            businessMembershipId: 2,
            language: lang,
          },
        },
      });
    });

    it('throws NotFoundError when translation does not exist', async () => {
      mockPrisma.businessMembershipTranslation.findUnique.mockResolvedValue(
        null,
      );

      await expect(
        service.deleteBusinessMembershipTranslation(2, lang, adminId, lang),
      ).rejects.toBeInstanceOf(NotFoundError);
      expect(
        mockPrisma.businessMembershipTranslation.delete,
      ).not.toHaveBeenCalled();
    });
  });

  describe('deleteBusinessMembershipPricing', () => {
    it('deletes the pricing by composite key and returns it', async () => {
      const pricing = { id: 21, businessMembershipId: 2, countryId: 1 };
      mockPrisma.businessMembershipPricing.findUnique.mockResolvedValue(
        pricing,
      );
      mockPrisma.businessMembershipPricing.delete.mockResolvedValue(pricing);

      const result = await service.deleteBusinessMembershipPricing(
        2,
        1,
        adminId,
        lang,
      );

      expect(result).toEqual(pricing);
      expect(mockPrisma.businessMembershipPricing.delete).toHaveBeenCalledWith({
        where: {
          businessMembershipId_countryId: {
            businessMembershipId: 2,
            countryId: 1,
          },
        },
      });
    });

    it('throws UnAuthorizedError when adminId is empty', async () => {
      await expect(
        service.deleteBusinessMembershipPricing(2, 1, '', lang),
      ).rejects.toBeInstanceOf(UnAuthorizedError);
    });

    it('throws NotFoundError when pricing does not exist', async () => {
      mockPrisma.businessMembershipPricing.findUnique.mockResolvedValue(null);

      await expect(
        service.deleteBusinessMembershipPricing(2, 1, adminId, lang),
      ).rejects.toBeInstanceOf(NotFoundError);
      expect(
        mockPrisma.businessMembershipPricing.delete,
      ).not.toHaveBeenCalled();
    });
  });

  describe('upsertBusinessMembershipTranslation', () => {
    const input = {
      businessMembershipId: 2,
      language: Language.EN,
      name: 'Startup',
      description: ['A startup plan'],
    };

    it('upserts and returns translation', async () => {
      const translation = { id: 11, ...input };
      mockPrisma.businessMembershipTranslation.upsert.mockResolvedValue(
        translation,
      );

      const result = await service.upsertBusinessMembershipTranslation(
        input,
        adminId,
        lang,
      );

      expect(result).toEqual(translation);
      expect(
        mockPrisma.businessMembershipTranslation.upsert,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            businessMembershipId_language: {
              businessMembershipId: 2,
              language: Language.EN,
            },
          },
        }),
      );
    });

    it('throws UnAuthorizedError when adminId is empty', async () => {
      await expect(
        service.upsertBusinessMembershipTranslation(input, '', lang),
      ).rejects.toBeInstanceOf(UnAuthorizedError);
    });

    it('throws InternalServerError on prisma failure', async () => {
      mockPrisma.businessMembershipTranslation.upsert.mockRejectedValue(
        new Error('db error'),
      );

      await expect(
        service.upsertBusinessMembershipTranslation(input, adminId, lang),
      ).rejects.toBeInstanceOf(InternalServerError);
    });
  });

  describe('upsertBusinessMembershipPricing', () => {
    const input = {
      businessMembershipId: 2,
      countryId: 1,
      currency: 'USD',
      price: 29.99,
      isActive: true,
    };

    it('upserts and returns pricing', async () => {
      const pricing = { id: 21, ...input };
      mockPrisma.businessMembershipPricing.upsert.mockResolvedValue(pricing);

      const result = await service.upsertBusinessMembershipPricing(
        input,
        adminId,
        lang,
      );

      expect(result).toEqual(pricing);
      expect(mockPrisma.businessMembershipPricing.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            businessMembershipId_countryId: {
              businessMembershipId: 2,
              countryId: 1,
            },
          },
        }),
      );
    });

    it('throws UnAuthorizedError when adminId is empty', async () => {
      await expect(
        service.upsertBusinessMembershipPricing(input, '', lang),
      ).rejects.toBeInstanceOf(UnAuthorizedError);
    });

    it('throws InternalServerError on prisma failure', async () => {
      mockPrisma.businessMembershipPricing.upsert.mockRejectedValue(
        new Error('db error'),
      );

      await expect(
        service.upsertBusinessMembershipPricing(input, adminId, lang),
      ).rejects.toBeInstanceOf(InternalServerError);
    });
  });

  describe('assignBusinessMembership', () => {
    const input = { businessMembershipId: 2, autoRenew: false };
    const subscription = { id: 'sub-2', sellerId, businessMembershipId: 2 };

    it('creates subscription and returns it', async () => {
      mockPrisma.businessMembership.findUnique.mockResolvedValue(
        businessMembershipRaw,
      );
      mockPrisma.businessMembershipSubscription.create.mockResolvedValue(
        subscription,
      );
      mockPrisma.businessProfile.update.mockResolvedValue({});

      const result = await service.assignBusinessMembership(
        sellerId,
        input,
        lang,
      );

      expect(result).toEqual(subscription);
      expect(
        mockPrisma.businessMembershipSubscription.create,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sellerId,
            businessMembershipId: input.businessMembershipId,
            autoRenew: false,
          }),
        }),
      );
      expect(mockPrisma.businessProfile.update).toHaveBeenCalledWith({
        where: { sellerId },
        data: { businessMembershipSubscriptionId: subscription.id },
      });
    });

    it('throws UnAuthorizedError when sellerId is empty', async () => {
      await expect(
        service.assignBusinessMembership('', input, lang),
      ).rejects.toBeInstanceOf(UnAuthorizedError);
      expect(mockPrisma.businessMembership.findUnique).not.toHaveBeenCalled();
    });

    it('throws NotFoundError when membership does not exist', async () => {
      mockPrisma.businessMembership.findUnique.mockResolvedValue(null);

      await expect(
        service.assignBusinessMembership(sellerId, input, lang),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it('throws InternalServerError when subscription create fails', async () => {
      mockPrisma.businessMembership.findUnique.mockResolvedValue(
        businessMembershipRaw,
      );
      mockPrisma.businessMembershipSubscription.create.mockRejectedValue(
        new Error('db error'),
      );

      await expect(
        service.assignBusinessMembership(sellerId, input, lang),
      ).rejects.toBeInstanceOf(InternalServerError);
    });
  });
});
