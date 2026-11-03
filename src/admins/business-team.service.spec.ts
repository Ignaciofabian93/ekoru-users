import { BusinessTeamService } from './business-team.service';
import { AdminPasswordService, hashAdminToken } from './admin-password.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { MailService } from '../mail/mail.service';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from '../common/exceptions';
import { AdminPermission, AdminRole, Language } from '../graphql/enums';

jest.mock('bcrypt', () => ({ hash: jest.fn().mockResolvedValue('hashed') }));

const OWNER = {
  id: 'owner',
  adminType: 'BUSINESS',
  role: 'BUSINESS_OWNER',
  permissions: [],
  isActive: true,
  sellerId: 'store-1',
};

function setup({ seats = 2, plan = 'BASIC' } = {}) {
  const prisma = {
    admin: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn(),
      update: jest.fn(),
    },
    seller: { findUnique: jest.fn() },
    businessMembershipSubscription: {
      findFirst: jest
        .fn()
        .mockResolvedValue({ businessMembership: { membershipType: plan } }),
    },
    businessPlanRule: {
      findUnique: jest.fn().mockResolvedValue({ panelSeats: seats }),
    },
  };
  const passwords = { sendLink: jest.fn().mockResolvedValue(true) };
  const service = new BusinessTeamService(
    prisma as unknown as PrismaService,
    passwords as unknown as AdminPasswordService,
  );
  return { prisma, passwords, service };
}

describe('BusinessTeamService (USR-15)', () => {
  describe('ensureOwner', () => {
    it('creates the owner with every business permission and emails the link', async () => {
      const { prisma, passwords, service } = setup();
      prisma.admin.findFirst.mockResolvedValue(null);
      prisma.seller.findUnique.mockResolvedValue({
        email: 'Shop@Example.com',
        businessProfile: { businessName: 'GuitarTune' },
      });
      prisma.admin.findUnique.mockResolvedValue(null);
      prisma.admin.create.mockResolvedValue({ id: 'new-owner' });

      await expect(service.ensureOwner('store-1')).resolves.toBe('new-owner');
      expect(prisma.admin.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'shop@example.com',
            name: 'GuitarTune',
            adminType: 'BUSINESS',
            role: AdminRole.BUSINESS_OWNER,
            sellerId: 'store-1',
            permissions: expect.arrayContaining([
              AdminPermission.MANAGE_BUSINESS_TEAM,
              AdminPermission.MANAGE_BUSINESS_PRODUCTS,
            ]),
          }),
        }),
      );
      expect(passwords.sendLink).toHaveBeenCalledWith({
        adminId: 'new-owner',
        kind: 'invite',
      });
    });

    it('does nothing when the plan has no panel', async () => {
      const { prisma, service } = setup({ seats: 0, plan: 'FREEMIUM' });

      await expect(service.ensureOwner('store-1')).resolves.toBeNull();
      expect(prisma.admin.create).not.toHaveBeenCalled();
    });

    it('leaves a business that already has panel accounts alone', async () => {
      const { prisma, service } = setup();
      prisma.admin.findFirst.mockResolvedValue({ id: 'made-by-ekoru' });

      await expect(service.ensureOwner('store-1')).resolves.toBeNull();
      expect(prisma.admin.create).not.toHaveBeenCalled();
    });

    it('skips an email that already has a panel account', async () => {
      const { prisma, service } = setup();
      prisma.admin.findFirst.mockResolvedValue(null);
      prisma.seller.findUnique.mockResolvedValue({
        email: 'shop@example.com',
        businessProfile: { businessName: 'GuitarTune' },
      });
      prisma.admin.findUnique.mockResolvedValue({ id: 'someone-else' });

      await expect(service.ensureOwner('store-1')).resolves.toBeNull();
      expect(prisma.admin.create).not.toHaveBeenCalled();
    });
  });

  describe('team calls', () => {
    const input = {
      email: 'staff@example.com',
      name: 'Ana',
      role: AdminRole.BUSINESS_MANAGER,
      permissions: [AdminPermission.MANAGE_BUSINESS_PRODUCTS],
    };

    it('lets the owner invite a member into its own business', async () => {
      const { prisma, passwords, service } = setup();
      prisma.admin.findUnique
        .mockResolvedValueOnce(OWNER) // the caller
        .mockResolvedValueOnce(null); // the email is free
      prisma.admin.count.mockResolvedValue(1);
      prisma.admin.create.mockResolvedValue({ id: 'staff', ...input });

      await service.inviteMember({
        adminId: 'owner',
        language: Language.ES,
        input,
      });
      expect(prisma.admin.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sellerId: 'store-1',
            adminType: 'BUSINESS',
          }),
        }),
      );
      expect(passwords.sendLink).toHaveBeenCalledWith({
        adminId: 'staff',
        kind: 'invite',
      });
    });

    it('refuses a member past the plan’s accounts', async () => {
      const { prisma, service } = setup({ seats: 2 });
      prisma.admin.findUnique
        .mockResolvedValueOnce(OWNER)
        .mockResolvedValueOnce(null);
      prisma.admin.count.mockResolvedValue(2);

      await expect(
        service.inviteMember({
          adminId: 'owner',
          language: Language.ES,
          input,
        }),
      ).rejects.toThrow('(2)');
      expect(prisma.admin.create).not.toHaveBeenCalled();
    });

    it('refuses a member without the team permission', async () => {
      const { prisma, service } = setup();
      prisma.admin.findUnique.mockResolvedValueOnce({
        ...OWNER,
        role: 'BUSINESS_ANALYST',
        permissions: [AdminPermission.VIEW_BUSINESS_ANALYTICS],
      });

      await expect(
        service.inviteMember({ adminId: 'a', language: Language.ES, input }),
      ).rejects.toBeInstanceOf(ForbiddenError);
    });

    it('refuses a platform admin', async () => {
      const { prisma, service } = setup();
      prisma.admin.findUnique.mockResolvedValueOnce({
        ...OWNER,
        adminType: 'PLATFORM',
        role: 'SUPER_ADMIN',
        sellerId: null,
      });

      await expect(
        service.getMyTeam({ adminId: 'staff', language: Language.ES }),
      ).rejects.toBeInstanceOf(ForbiddenError);
    });

    it('refuses a second owner and permissions the caller lacks', async () => {
      const { prisma, service } = setup();
      const manager = {
        ...OWNER,
        role: 'BUSINESS_MANAGER',
        permissions: [AdminPermission.MANAGE_BUSINESS_TEAM],
      };
      prisma.admin.findUnique.mockResolvedValue(manager);

      await expect(
        service.inviteMember({
          adminId: 'manager',
          language: Language.ES,
          input: { ...input, role: AdminRole.BUSINESS_OWNER },
        }),
      ).rejects.toBeInstanceOf(BadRequestError);
      await expect(
        service.inviteMember({
          adminId: 'manager',
          language: Language.ES,
          input,
        }),
      ).rejects.toBeInstanceOf(BadRequestError);
    });

    it('never touches another business’s account, the owner or yourself', async () => {
      const { prisma, service } = setup();
      prisma.admin.findUnique.mockResolvedValue(OWNER);

      prisma.admin.findFirst.mockResolvedValueOnce(null);
      await expect(
        service.setMemberActive({
          adminId: 'owner',
          language: Language.ES,
          id: 'other-store-admin',
          isActive: false,
        }),
      ).rejects.toBeInstanceOf(NotFoundError);
      expect(prisma.admin.findFirst).toHaveBeenLastCalledWith(
        expect.objectContaining({
          where: {
            id: 'other-store-admin',
            sellerId: 'store-1',
            adminType: 'BUSINESS',
          },
        }),
      );

      prisma.admin.findFirst.mockResolvedValueOnce({ ...OWNER });
      await expect(
        service.setMemberActive({
          adminId: 'owner',
          language: Language.ES,
          id: 'owner',
          isActive: false,
        }),
      ).rejects.toBeInstanceOf(BadRequestError);
      expect(prisma.admin.update).not.toHaveBeenCalled();
    });

    it('seats the owner first, then the oldest active accounts', async () => {
      const { prisma, service } = setup({ seats: 2 });
      prisma.admin.findUnique.mockResolvedValue(OWNER);
      prisma.admin.findMany.mockResolvedValue([
        { id: 'old', role: 'BUSINESS_MANAGER', isActive: true },
        { id: 'off', role: 'BUSINESS_SUPPORT', isActive: false },
        { id: 'newer', role: 'BUSINESS_SUPPORT', isActive: true },
        { id: 'owner', role: 'BUSINESS_OWNER', isActive: true },
      ]);

      const team = await service.getMyTeam({
        adminId: 'owner',
        language: Language.ES,
      });
      expect(team.seats).toBe(2);
      expect(team.used).toBe(3);
      expect(team.members.map((m) => [m.id, m.hasSeat])).toEqual([
        ['owner', true],
        ['old', true],
        ['off', false],
        ['newer', false],
      ]);
    });
  });
});

describe('AdminPasswordService (USR-15)', () => {
  function passwordSetup() {
    const tx = {
      adminPasswordToken: { updateMany: jest.fn() },
      admin: { update: jest.fn() },
      $executeRaw: jest.fn(),
    };
    const prisma = {
      admin: { findUnique: jest.fn() },
      adminPasswordToken: {
        findUnique: jest.fn(),
        findFirst: jest.fn().mockResolvedValue(null),
        deleteMany: jest.fn(),
        create: jest.fn(),
      },
      $transaction: jest.fn((arg: unknown) =>
        typeof arg === 'function'
          ? (arg as (t: typeof tx) => unknown)(tx)
          : Promise.all(arg as unknown[]),
      ),
    };
    const mail = {
      adminPanelUrl: () => 'https://staging-admin.ekoru.cl',
      sendAdminAccessEmail: jest.fn().mockResolvedValue(true),
    };
    const service = new AdminPasswordService(
      prisma as unknown as PrismaService,
      mail as unknown as MailService,
    );
    return { prisma, tx, mail, service };
  }

  it('emails an invite link to the panel, stores only the hash', async () => {
    const { prisma, mail, service } = passwordSetup();
    prisma.admin.findUnique.mockResolvedValue({
      id: 'owner',
      email: 'shop@example.com',
      name: 'GuitarTune',
      seller: {
        contentLanguage: 'ES',
        businessProfile: { businessName: 'GuitarTune' },
      },
    });

    await service.sendLink({ adminId: 'owner', kind: 'invite' });

    const sent = mail.sendAdminAccessEmail.mock.calls[0][0] as {
      locale: string;
      data: { url: string; businessName: string };
    };
    expect(sent.locale).toBe('es');
    expect(sent.data.businessName).toBe('GuitarTune');
    const token = new URL(sent.data.url).searchParams.get('token')!;
    expect(sent.data.url).toMatch(
      /^https:\/\/staging-admin\.ekoru\.cl\/es\/set-password\?token=/,
    );
    expect(prisma.adminPasswordToken.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        adminId: 'owner',
        tokenHash: hashAdminToken(token),
      }),
    });
  });

  it('answers a reset request the same way for an unknown address', async () => {
    const { prisma, mail, service } = passwordSetup();
    prisma.admin.findUnique.mockResolvedValue(null);

    await expect(
      service.requestReset({ email: 'nobody@x.cl', language: Language.ES }),
    ).resolves.toBe(true);
    expect(mail.sendAdminAccessEmail).not.toHaveBeenCalled();
  });

  it('sets the password once and ends the other sessions', async () => {
    const { prisma, tx, service } = passwordSetup();
    prisma.adminPasswordToken.findUnique.mockResolvedValue({
      id: 't1',
      adminId: 'owner',
      usedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    tx.adminPasswordToken.updateMany.mockResolvedValue({ count: 1 });

    await expect(
      service.setPassword({
        token: 'abc',
        newPassword: 'longenough',
        language: Language.ES,
      }),
    ).resolves.toBe(true);
    expect(tx.admin.update).toHaveBeenCalledWith({
      where: { id: 'owner' },
      data: { password: 'hashed', isEmailVerified: true, loginAttempts: 0 },
    });
    expect(tx.$executeRaw).toHaveBeenCalled();
  });

  it('refuses an expired link and a short password', async () => {
    const { prisma, service } = passwordSetup();
    prisma.adminPasswordToken.findUnique.mockResolvedValue({
      id: 't1',
      adminId: 'owner',
      usedAt: null,
      expiresAt: new Date(Date.now() - 1),
    });

    await expect(
      service.setPassword({
        token: 'abc',
        newPassword: 'longenough',
        language: Language.ES,
      }),
    ).rejects.toThrow('caducó');
    await expect(
      service.setPassword({
        token: 'abc',
        newPassword: 'short',
        language: Language.ES,
      }),
    ).rejects.toThrow('8 caracteres');
  });
});
