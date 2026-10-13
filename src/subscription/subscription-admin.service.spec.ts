import { SubscriptionAdminService } from './subscription-admin.service';
import { MembershipKind } from './entities/admin-membership-subscription.entity';
import { PrismaService } from '../prisma/prisma.service';
import { Language } from '../graphql/enums';

describe('SubscriptionAdminService (ADM-12)', () => {
  const admin = (permissions: string[]) => ({
    adminType: 'PLATFORM',
    role: 'MODERATOR',
    permissions,
    isActive: true,
    sellerId: null,
  });

  const term = {
    id: 4,
    sellerId: 'seller-1',
    personMembershipId: 2,
    startDate: new Date('2026-09-01'),
    endDate: new Date('2026-10-01'),
    isActive: true,
    autoRenew: false,
    paymentId: 31,
    createdAt: new Date('2026-09-01'),
    updatedAt: new Date('2026-09-01'),
    personMembership: {
      membershipType: 'ADVANCED',
      translations: [{ name: 'Advanced' }],
    },
    seller: {
      email: 'ana@example.com',
      personProfile: { displayName: null, firstName: 'Ana', lastName: 'Rojas' },
    },
  };

  const prisma = {
    admin: { findUnique: jest.fn() },
    personMembershipSubscription: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    businessMembershipSubscription: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    personProfile: { updateMany: jest.fn() },
    businessProfile: { updateMany: jest.fn() },
    $queryRaw: jest.fn(),
    $transaction: jest.fn(),
  };
  const service = new SubscriptionAdminService(
    prisma as unknown as PrismaService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.admin.findUnique.mockResolvedValue(admin(['VIEW_TRANSACTIONS']));
    prisma.personMembershipSubscription.count.mockResolvedValue(1);
    prisma.personMembershipSubscription.findMany.mockResolvedValue([term]);
    prisma.$queryRaw.mockResolvedValue([
      { id: 31, amount: 4990, status: 'COMPLETED', provider: 'TRANSBANK' },
    ]);
    prisma.$transaction.mockResolvedValue([]);
  });

  it('lists terms with the holder, plan and payment', async () => {
    const result = await service.list({
      adminId: 'admin-1',
      language: Language.ES,
      kind: MembershipKind.PERSON,
    });

    expect(result.nodes).toEqual([
      expect.objectContaining({
        id: 4,
        kind: MembershipKind.PERSON,
        sellerEmail: 'ana@example.com',
        sellerName: 'Ana Rojas',
        plan: 'ADVANCED',
        planName: 'Advanced',
        paymentAmount: 4990,
        paymentStatus: 'COMPLETED',
        paymentProvider: 'TRANSBANK',
      }),
    ]);
  });

  it('filters by state, plan, end date and seller', async () => {
    const endsBefore = new Date('2026-11-01');
    await service.list({
      adminId: 'admin-1',
      language: Language.ES,
      kind: MembershipKind.PERSON,
      active: true,
      plan: 'ADVANCED',
      endsBefore,
      search: ' ana ',
    });

    const { where } = prisma.personMembershipSubscription.findMany.mock
      .calls[0][0] as { where: Record<string, unknown> };
    expect(where).toMatchObject({
      isActive: true,
      endDate: { lte: endsBefore },
      personMembership: { membershipType: 'ADVANCED' },
    });
    expect(JSON.stringify(where.seller)).toContain('"contains":"ana"');
  });

  it('refuses a plan of the other kind and an admin without permission', async () => {
    await expect(
      service.list({
        adminId: 'admin-1',
        language: Language.EN,
        kind: MembershipKind.PERSON,
        plan: 'EXPERT',
      }),
    ).rejects.toThrow();

    prisma.admin.findUnique.mockResolvedValue(admin(['MANAGE_SETTINGS']));
    await expect(
      service.list({
        adminId: 'admin-1',
        language: Language.EN,
        kind: MembershipKind.PERSON,
      }),
    ).rejects.toMatchObject({ extensions: { code: 'FORBIDDEN' } });
  });

  it('cancels an active term and returns the profile to the free plan', async () => {
    prisma.admin.findUnique.mockResolvedValue(admin(['MANAGE_USERS']));
    prisma.businessMembershipSubscription.findUnique.mockResolvedValue({
      id: 9,
      isActive: true,
    });

    await expect(
      service.cancel({
        adminId: 'admin-1',
        language: Language.ES,
        kind: MembershipKind.BUSINESS,
        id: 9,
      }),
    ).resolves.toBe(9);

    expect(prisma.businessMembershipSubscription.update).toHaveBeenCalledWith({
      where: { id: 9 },
      data: expect.objectContaining({ isActive: false, autoRenew: false }),
    });
    expect(prisma.businessProfile.updateMany).toHaveBeenCalledWith({
      where: { businessMembershipSubscriptionId: 9 },
      data: { businessMembershipSubscriptionId: null },
    });
  });

  it('needs MANAGE_USERS to cancel', async () => {
    await expect(
      service.cancel({
        adminId: 'admin-1',
        language: Language.ES,
        kind: MembershipKind.PERSON,
        id: 4,
      }),
    ).rejects.toMatchObject({ extensions: { code: 'FORBIDDEN' } });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
