import { BusinessReviewResolver } from './business-review.resolver';
import { PrismaService } from '../prisma/prisma.service';
import { AdminAccessRow } from '../common/admin-access';

const profile = {
  sellerId: 'biz-1',
  applicationMessage: 'We repair furniture with reclaimed wood.',
  rejectionReason: 'Missing tax id.',
  reviewedAt: new Date('2026-10-01T00:00:00Z'),
};

const admin = (over: Partial<AdminAccessRow> = {}): AdminAccessRow => ({
  adminType: 'PLATFORM',
  role: 'MODERATOR',
  permissions: [],
  isActive: true,
  sellerId: null,
  ...over,
});

const setup = (row: AdminAccessRow | null) => {
  const findUnique = jest.fn().mockResolvedValue(row);
  const prisma = { admin: { findUnique } } as unknown as PrismaService;
  return { resolver: new BusinessReviewResolver(prisma), findUnique };
};

describe('BusinessReviewResolver (USR-8)', () => {
  it('shows the review fields to the business itself', async () => {
    const { resolver, findUnique } = setup(null);
    await expect(
      resolver.applicationMessage(profile, {}, undefined, 'biz-1'),
    ).resolves.toBe(profile.applicationMessage);
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('hides them from another seller and from the public', async () => {
    const { resolver } = setup(null);
    await expect(
      resolver.rejectionReason(profile, {}, undefined, 'seller-2'),
    ).resolves.toBeNull();
    await expect(resolver.reviewedAt(profile, {})).resolves.toBeNull();
  });

  it('shows them to a platform admin with MANAGE_USERS', async () => {
    const { resolver } = setup(admin({ permissions: ['MANAGE_USERS'] }));
    await expect(
      resolver.applicationMessage(profile, {}, 'admin-1'),
    ).resolves.toBe(profile.applicationMessage);
  });

  it('hides them from a platform admin without MANAGE_USERS', async () => {
    const { resolver } = setup(admin({ permissions: ['MANAGE_SETTINGS'] }));
    await expect(
      resolver.applicationMessage(profile, {}, 'admin-1'),
    ).resolves.toBeNull();
  });

  it("shows them to the business's own business admin, not to another business", async () => {
    const own = setup(admin({ adminType: 'BUSINESS', sellerId: 'biz-1' }));
    await expect(
      own.resolver.rejectionReason(profile, {}, 'admin-own'),
    ).resolves.toBe(profile.rejectionReason);

    const other = setup(admin({ adminType: 'BUSINESS', sellerId: 'biz-2' }));
    await expect(
      other.resolver.rejectionReason(profile, {}, 'admin-other'),
    ).resolves.toBeNull();
  });

  it('reads the admin row once per request', async () => {
    const { resolver, findUnique } = setup(admin({ role: 'SUPER_ADMIN' }));
    const ctx = {};
    await resolver.applicationMessage(profile, ctx, 'admin-1');
    await resolver.rejectionReason(profile, ctx, 'admin-1');
    await resolver.reviewedAt(
      { ...profile, sellerId: 'biz-9' },
      ctx,
      'admin-1',
    );
    expect(findUnique).toHaveBeenCalledTimes(1);
  });
});
