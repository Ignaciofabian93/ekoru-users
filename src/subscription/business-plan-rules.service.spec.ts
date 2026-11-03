import { BusinessPlanRulesService } from './business-plan-rules.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestError } from '../common/exceptions';
import { BusinessSubscriptionPlan, Language } from '../graphql/enums';
import { assertAdminCan } from '../common/admin-access';

jest.mock('../common/admin-access', () => ({
  assertAdminCan: jest.fn().mockResolvedValue('admin-1'),
}));

function setup() {
  const prisma = {
    businessPlanRule: {
      findMany: jest.fn().mockResolvedValue([]),
      upsert: jest.fn().mockResolvedValue({ panelSeats: 3 }),
    },
  };
  const service = new BusinessPlanRulesService(
    prisma as unknown as PrismaService,
  );
  return { prisma, service };
}

describe('BusinessPlanRulesService (USR-15)', () => {
  it('lists every plan in order, a plan without a row having no panel', async () => {
    const { prisma, service } = setup();
    prisma.businessPlanRule.findMany.mockResolvedValue([
      { plan: 'BASIC', panelSeats: 2 },
    ]);

    await expect(service.list()).resolves.toEqual([
      { plan: 'FREEMIUM', panelSeats: 0 },
      { plan: 'STARTUP', panelSeats: 0 },
      { plan: 'BASIC', panelSeats: 2 },
      { plan: 'ADVANCED', panelSeats: 0 },
      { plan: 'EXPERT', panelSeats: 0 },
    ]);
  });

  it('saves a plan’s seats behind MANAGE_SETTINGS', async () => {
    const { prisma, service } = setup();

    await expect(
      service.update({
        adminId: 'admin-1',
        language: Language.ES,
        plan: BusinessSubscriptionPlan.ADVANCED,
        panelSeats: 3,
      }),
    ).resolves.toEqual({ plan: 'ADVANCED', panelSeats: 3 });

    expect(assertAdminCan).toHaveBeenCalledWith(
      prisma,
      expect.objectContaining({ permission: 'MANAGE_SETTINGS' }),
    );
    expect(prisma.businessPlanRule.upsert).toHaveBeenCalledWith({
      where: { plan: 'ADVANCED' },
      create: { plan: 'ADVANCED', panelSeats: 3 },
      update: { panelSeats: 3 },
      select: { panelSeats: true },
    });
  });

  it.each([-1, 1.5, 51])('refuses %p seats', async (panelSeats) => {
    const { prisma, service } = setup();

    await expect(
      service.update({
        adminId: 'admin-1',
        language: Language.ES,
        plan: BusinessSubscriptionPlan.STARTUP,
        panelSeats,
      }),
    ).rejects.toThrow(BadRequestError);
    expect(prisma.businessPlanRule.upsert).not.toHaveBeenCalled();
  });
});
