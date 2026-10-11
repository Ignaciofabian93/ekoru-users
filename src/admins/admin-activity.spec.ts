import { AdminsService } from './admins.service';
import { PrismaService } from '../prisma/prisma.service';
import { Language } from '../graphql/enums';

describe('AdminsService.getActivityLogs (ADM-7)', () => {
  function make(caller: Record<string, unknown> | null) {
    const prisma = {
      admin: { findUnique: jest.fn().mockResolvedValue(caller) },
      adminActivityLog: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 5,
            adminId: 'a2',
            action: 'APPROVE_BUSINESS',
            entityType: 'Seller',
            entityId: 's1',
            changes: null,
            metadata: null,
            ipAddress: null,
            createdAt: new Date('2026-10-10T12:00:00Z'),
            admin: { email: 'ops@ekoru.cl' },
          },
        ]),
      },
    };
    return {
      prisma,
      service: new AdminsService(prisma as unknown as PrismaService),
    };
  }
  const platform = (permissions: string[]) => ({
    adminType: 'PLATFORM',
    role: 'MODERATOR',
    permissions,
    isActive: true,
    sellerId: null,
  });
  const read = (service: AdminsService, adminId?: string) =>
    service.getActivityLogs({
      adminId,
      language: Language.ES,
      page: 1,
      pageSize: 20,
      action: 'APPROVE_BUSINESS',
      from: new Date('2026-10-01T00:00:00Z'),
    });

  it('lists entries with the acting admin email, for VIEW_SYSTEM_LOGS', async () => {
    const { service, prisma } = make(platform(['VIEW_SYSTEM_LOGS']));

    const page = await read(service, 'a1');

    expect(page.nodes[0]).toMatchObject({
      action: 'APPROVE_BUSINESS',
      adminEmail: 'ops@ekoru.cl',
    });
    expect(page.nodes[0]).not.toHaveProperty('admin');
    expect(prisma.adminActivityLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          action: 'APPROVE_BUSINESS',
          createdAt: { gte: new Date('2026-10-01T00:00:00Z') },
        },
      }),
    );
  });

  it('refuses an admin without the permission and a signed-out caller', async () => {
    await expect(
      read(make(platform(['MANAGE_USERS'])).service, 'a1'),
    ).rejects.toMatchObject({ extensions: { code: 'FORBIDDEN' } });
    await expect(read(make(null).service, undefined)).rejects.toMatchObject({
      extensions: { code: 'UNAUTHORIZED' },
    });
  });
});
