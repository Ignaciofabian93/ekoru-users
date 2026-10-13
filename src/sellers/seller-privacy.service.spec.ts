import { SellerPrivacyService } from './seller-privacy.service';
import { PrismaService } from '../prisma/prisma.service';

describe('SellerPrivacyService (USR-10)', () => {
  const prisma = {
    $queryRaw: jest.fn(),
    sellerPreferences: { findUnique: jest.fn() },
  };
  const privacy = new SellerPrivacyService(prisma as unknown as PrismaService);

  const person = {
    id: 'person-1',
    sellerType: 'PERSON',
    sellerPreferences: { showMyAddress: false, showMySocials: false },
  };
  const business = { ...person, id: 'business-1', sellerType: 'COMPANY' };
  const open = {
    ...person,
    sellerPreferences: { showMyAddress: true, showMySocials: true },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.INTERNAL_SERVICE_SECRET = 'internal-secret';
    prisma.$queryRaw.mockResolvedValue([{ linked: false }]);
  });

  it("hides a person's contact, address, socials and preferences from strangers", async () => {
    for (const viewer of [{}, { sellerId: 'someone-else' }]) {
      expect(await privacy.canSeeContact(viewer, person)).toBe(false);
      expect(await privacy.canSeeAddress(viewer, person)).toBe(false);
      expect(await privacy.canSeeSocials(viewer, person)).toBe(false);
      expect(privacy.canSeePreferences(viewer, person)).toBe(false);
    }
  });

  it('shows everything to the seller, platform admins and sibling services', async () => {
    const viewers = [
      { sellerId: 'person-1' },
      { adminId: 'admin-1', adminType: 'PLATFORM' },
      { internalSecret: 'internal-secret' },
    ];
    for (const viewer of viewers) {
      expect(await privacy.canSeeContact(viewer, person)).toBe(true);
      expect(await privacy.canSeeAddress(viewer, person)).toBe(true);
      expect(await privacy.canSeeSocials(viewer, person)).toBe(true);
      expect(privacy.canSeePreferences(viewer, person)).toBe(true);
    }
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it('refuses a wrong internal secret and a business admin acting for someone else', async () => {
    expect(
      await privacy.canSeeContact({ internalSecret: 'guess' }, person),
    ).toBe(false);
    expect(
      privacy.canSeePreferences(
        {
          adminId: 'admin-2',
          adminType: 'BUSINESS',
          adminSellerId: 'business-1',
        },
        person,
      ),
    ).toBe(false);
  });

  it("shows a business's contact and address, and socials only by choice", async () => {
    expect(await privacy.canSeeContact({}, business)).toBe(true);
    expect(await privacy.canSeeAddress({}, business)).toBe(true);
    expect(await privacy.canSeeSocials({}, business)).toBe(false);
  });

  it('follows showMyAddress and showMySocials', async () => {
    expect(await privacy.canSeeAddress({}, open)).toBe(true);
    expect(await privacy.canSeeSocials({}, open)).toBe(true);
  });

  it('loads the switches once per request when the query did not include them', async () => {
    prisma.sellerPreferences.findUnique.mockResolvedValue({
      showMyAddress: true,
      showMySocials: false,
    });
    const viewer = {};
    const bare = { id: 'person-1', sellerType: 'PERSON' };

    expect(await privacy.canSeeAddress(viewer, bare)).toBe(true);
    expect(await privacy.canSeeSocials(viewer, bare)).toBe(false);
    expect(prisma.sellerPreferences.findUnique).toHaveBeenCalledTimes(1);
  });

  it("gives a counterparty the person's contact, asking the database once", async () => {
    prisma.$queryRaw.mockResolvedValue([{ linked: true }]);
    const viewer = { sellerId: 'buyer-1' };

    expect(await privacy.canSeeContact(viewer, person)).toBe(true);
    expect(await privacy.canSeeContact(viewer, person)).toBe(true);
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    // A counterparty still does not get the address or the switches.
    expect(await privacy.canSeeAddress(viewer, person)).toBe(false);
    expect(privacy.canSeePreferences(viewer, person)).toBe(false);
  });

  it('counts a business admin as their own business', async () => {
    prisma.$queryRaw.mockResolvedValue([{ linked: true }]);
    const viewer = {
      adminId: 'admin-2',
      adminType: 'BUSINESS',
      adminSellerId: 'business-1',
    };

    expect(await privacy.canSeeContact(viewer, person)).toBe(true);
    const [, me, target] = prisma.$queryRaw.mock.calls[0] as unknown[];
    expect([me, target]).toEqual(['business-1', 'person-1']);
  });
});
