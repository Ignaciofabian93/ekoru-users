import { Prisma } from '@prisma/client';
import { SellerAdminService } from './seller-admin.service';
import { PrismaService } from '../../prisma/prisma.service';
import { Language, SellerType, BusinessType } from '../../graphql/enums';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('random-hash'),
  genSalt: jest.fn().mockResolvedValue('salt'),
}));

const usersAdmin = {
  adminType: 'PLATFORM',
  role: 'SUPPORT',
  permissions: ['MANAGE_USERS'],
  isActive: true,
  sellerId: null,
};

function setup() {
  const prisma = {
    admin: { findUnique: jest.fn().mockResolvedValue(usersAdmin) },
    adminActivityLog: { create: jest.fn().mockResolvedValue({}) },
    seller: {
      count: jest.fn().mockResolvedValue(1),
      findMany: jest.fn(),
      findUnique: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue({}),
      create: jest.fn().mockResolvedValue({ id: 'new-id' }),
    },
    personProfile: {
      findUnique: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue({}),
      create: jest.fn().mockResolvedValue({}),
    },
    businessProfile: {
      findUnique: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue({}),
      create: jest.fn().mockResolvedValue({}),
    },
    sellerPreferences: {
      findUnique: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue({}),
      create: jest.fn().mockResolvedValue({}),
    },
  };
  const service = new SellerAdminService(prisma as unknown as PrismaService);
  return { prisma, service };
}

const language = Language.ES;

describe('SellerAdminService (sellers workbook)', () => {
  describe('rawSellers', () => {
    it('needs MANAGE_USERS', async () => {
      const { prisma, service } = setup();
      prisma.admin.findUnique.mockResolvedValue({
        ...usersAdmin,
        adminType: 'BUSINESS',
      });
      await expect(
        service.rawSellers({ adminId: 'a1', language }),
      ).rejects.toMatchObject({ extensions: { code: 'FORBIDDEN' } });
    });

    it('returns every column except the password, JSON as text', async () => {
      const { prisma, service } = setup();
      prisma.seller.findMany.mockResolvedValue([
        {
          id: 's1',
          email: 'a@b.cl',
          socialMediaLinks: { instagram: '@a' },
          personProfile: null,
          businessProfile: {
            businessName: 'Acme',
            businessHours: { mon: '9-18' },
          },
          sellerPreferences: { enableEmailNotifications: true },
        },
      ]);

      const result = await service.rawSellers({
        adminId: 'a1',
        language,
        pageSize: 9999,
      });

      const node = result.nodes[0] as Record<string, unknown>;
      expect(node).not.toHaveProperty('password');
      expect(prisma.seller.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ omit: { password: true } }),
      );
      expect(node.socialMediaLinks).toBe('{"instagram":"@a"}');
      expect(node.businessProfile).toMatchObject({
        businessHours: '{"mon":"9-18"}',
      });
      expect(node.preferences).toEqual({ enableEmailNotifications: true });
      expect(prisma.seller.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 500 }),
      );
    });
  });

  describe('bulkUpsertSellers', () => {
    it('updates an existing seller by id with the values in the file', async () => {
      const { prisma, service } = setup();
      prisma.seller.findUnique.mockResolvedValue({ id: 's1' });

      const result = await service.bulkUpsertSellers({
        adminId: 'a1',
        language,
        rows: [{ id: 's1', email: ' A@B.cl ', isActive: false, points: 120 }],
      });

      expect(result).toMatchObject({ updated: 1, created: 0, failed: 0 });
      expect(prisma.seller.update).toHaveBeenCalledWith({
        where: { id: 's1' },
        data: { email: 'a@b.cl', isActive: false, points: 120 },
      });
      expect(prisma.adminActivityLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: 'BULK_IMPORT_SELLERS' }),
        }),
      );
    });

    it('restores a backup row under its id, with a password nobody knows', async () => {
      const { prisma, service } = setup();

      const result = await service.bulkUpsertSellers({
        adminId: 'a1',
        language,
        rows: [
          { id: 'old-id', email: 'x@y.cl', sellerType: SellerType.PERSON },
        ],
      });

      expect(result).toMatchObject({ created: 1, createdIds: ['new-id'] });
      expect(prisma.seller.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          id: 'old-id',
          email: 'x@y.cl',
          sellerType: SellerType.PERSON,
          password: 'random-hash',
        }),
        select: { id: true },
      });
    });

    it('matches a row without id by email', async () => {
      const { prisma, service } = setup();
      prisma.seller.findUnique.mockResolvedValue({ id: 's9' });

      await service.bulkUpsertSellers({
        adminId: 'a1',
        language,
        rows: [{ email: 'known@b.cl', phone: '+56 9 1234 5678' }],
      });

      expect(prisma.seller.findUnique).toHaveBeenCalledWith({
        where: { email: 'known@b.cl' },
        select: { id: true },
      });
      expect(prisma.seller.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 's9' } }),
      );
    });

    it('reports bad rows without stopping the batch', async () => {
      const { service } = setup();

      const result = await service.bulkUpsertSellers({
        adminId: 'a1',
        language,
        rows: [
          { email: 'new@b.cl' }, // no sellerType to create
          { id: 's2', socialMediaLinks: '{broken' },
          { email: 'ok@b.cl', sellerType: SellerType.COMPANY },
        ],
      });

      expect(result.failed).toBe(2);
      expect(result.created).toBe(1);
      expect(result.errors.map((e) => e.index)).toEqual([0, 1]);
      expect(result.errors[1].message).toContain('socialMediaLinks');
    });

    it('clears a JSON column with an empty cell', async () => {
      const { prisma, service } = setup();
      prisma.seller.findUnique.mockResolvedValue({ id: 's1' });

      await service.bulkUpsertSellers({
        adminId: 'a1',
        language,
        rows: [{ id: 's1', socialMediaLinks: '' }],
      });

      expect(prisma.seller.update).toHaveBeenCalledWith({
        where: { id: 's1' },
        data: { socialMediaLinks: Prisma.DbNull },
      });
    });
  });

  describe('profiles and preferences', () => {
    it('creates a person profile only with a first name', async () => {
      const { prisma, service } = setup();

      const result = await service.bulkUpsertPersonProfiles({
        adminId: 'a1',
        language,
        rows: [
          { sellerId: 's1', lastName: 'Pérez' },
          { sellerId: 's2', firstName: 'Ana', birthday: '1990-05-01' },
        ],
      });

      expect(result).toMatchObject({ failed: 1, created: 1 });
      expect(result.errors[0]).toMatchObject({ index: 0, id: 's1' });
      expect(prisma.personProfile.create).toHaveBeenCalledWith({
        data: {
          sellerId: 's2',
          firstName: 'Ana',
          birthday: new Date('1990-05-01'),
        },
      });
    });

    it('updates a business profile, approval state included, as in the file', async () => {
      const { prisma, service } = setup();
      prisma.businessProfile.findUnique.mockResolvedValue({ id: 'bp1' });

      await service.bulkUpsertBusinessProfiles({
        adminId: 'a1',
        language,
        rows: [
          {
            sellerId: 's1',
            businessType: BusinessType.RETAIL,
            approvalStatus: 'APPROVED' as never,
            certifications: ['B Corp'],
          },
        ],
      });

      expect(prisma.businessProfile.update).toHaveBeenCalledWith({
        where: { sellerId: 's1' },
        data: {
          businessType: BusinessType.RETAIL,
          approvalStatus: 'APPROVED',
          certifications: ['B Corp'],
        },
      });
    });

    it('rejects an invalid date', async () => {
      const { service } = setup();
      const result = await service.bulkUpsertBusinessProfiles({
        adminId: 'a1',
        language,
        rows: [{ sellerId: 's1', businessStartDate: 'not a date' }],
      });
      expect(result.errors[0].message).toContain('businessStartDate');
    });

    it('creates or updates preferences by seller', async () => {
      const { prisma, service } = setup();
      prisma.sellerPreferences.findUnique
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce(null);

      const result = await service.bulkUpsertSellerPreferences({
        adminId: 'a1',
        language,
        rows: [
          { sellerId: 's1', enableLoginAlerts: true },
          { sellerId: 's2', enablePushNotifications: true },
        ],
      });

      expect(result).toMatchObject({ updated: 1, created: 1 });
      expect(prisma.sellerPreferences.create).toHaveBeenCalledWith({
        data: { sellerId: 's2', enablePushNotifications: true },
      });
    });
  });
});
