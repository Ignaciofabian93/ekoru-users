import { adminRowCan, assertAdminCan, AdminAccessRow } from './admin-access';
import { AdminPermission } from '../graphql/enums';
import { PrismaService } from '../prisma/prisma.service';

const row = (over: Partial<AdminAccessRow> = {}): AdminAccessRow => ({
  adminType: 'PLATFORM',
  role: 'MODERATOR',
  permissions: [],
  isActive: true,
  sellerId: null,
  ...over,
});

const prismaReturning = (admin: AdminAccessRow | null) =>
  ({
    admin: { findUnique: jest.fn().mockResolvedValue(admin) },
  }) as unknown as PrismaService;

const messages = { unauthorized: 'signed out', forbidden: 'not allowed' };

describe('adminRowCan', () => {
  it('lets SUPER_ADMIN through without explicit permissions', () => {
    expect(
      adminRowCan(row({ role: 'SUPER_ADMIN' }), AdminPermission.MANAGE_USERS),
    ).toBe(true);
  });

  it('needs the permission otherwise', () => {
    expect(adminRowCan(row(), AdminPermission.MANAGE_USERS)).toBe(false);
    expect(
      adminRowCan(
        row({ permissions: ['MANAGE_USERS'] }),
        AdminPermission.MANAGE_USERS,
      ),
    ).toBe(true);
  });

  it('accepts any one of several permissions', () => {
    expect(
      adminRowCan(row({ permissions: ['MANAGE_SETTINGS'] }), [
        AdminPermission.MANAGE_USERS,
        AdminPermission.MANAGE_SETTINGS,
      ]),
    ).toBe(true);
  });

  it('never lets a BUSINESS admin through', () => {
    expect(
      adminRowCan(
        row({
          adminType: 'BUSINESS',
          role: 'SUPER_ADMIN',
          permissions: ['MANAGE_USERS'],
        }),
        AdminPermission.MANAGE_USERS,
      ),
    ).toBe(false);
  });

  it('never lets an inactive or unknown admin through', () => {
    expect(
      adminRowCan(
        row({ role: 'SUPER_ADMIN', isActive: false }),
        AdminPermission.MANAGE_USERS,
      ),
    ).toBe(false);
    expect(adminRowCan(null, AdminPermission.MANAGE_USERS)).toBe(false);
  });
});

describe('assertAdminCan', () => {
  it('rejects a signed-out caller as UNAUTHORIZED without a lookup', async () => {
    const prisma = prismaReturning(row());
    await expect(
      assertAdminCan(prisma, {
        adminId: undefined,
        permission: AdminPermission.MANAGE_USERS,
        messages,
      }),
    ).rejects.toMatchObject({
      message: 'signed out',
      extensions: { code: 'UNAUTHORIZED' },
    });
    expect(prisma.admin.findUnique).not.toHaveBeenCalled();
  });

  it('rejects a signed-in admin without the permission as FORBIDDEN', async () => {
    await expect(
      assertAdminCan(prismaReturning(row()), {
        adminId: 'a1',
        permission: AdminPermission.MANAGE_USERS,
        messages,
      }),
    ).rejects.toMatchObject({
      message: 'not allowed',
      extensions: { code: 'FORBIDDEN' },
    });
  });

  it('returns the admin id when allowed', async () => {
    await expect(
      assertAdminCan(prismaReturning(row({ permissions: ['MANAGE_USERS'] })), {
        adminId: 'a1',
        permission: AdminPermission.MANAGE_USERS,
        messages,
      }),
    ).resolves.toBe('a1');
  });
});
