import { NotificationType, Prisma } from '@prisma/client';
import { PointsService } from './points.service';
import { computePoints, EMPTY_RULE } from './points-rules';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

describe('computePoints', () => {
  const rule = {
    pointsAwarded: 20,
    pointsPerKgCo2: 1,
    pointsPerCubicMeterWater: 1,
    maxImpactPoints: 100,
  };

  it('gives the base points when nothing physical changed hands', () => {
    expect(computePoints(rule)).toEqual({
      basePoints: 20,
      impactPoints: 0,
      points: 20,
    });
  });

  it('adds impact points for the CO2 and water saved', () => {
    // A cotton jacket: ~3.8 kg CO2 and 7,000 L of water.
    expect(
      computePoints(rule, { co2SavingsKG: 3.8, waterSavingsLT: 7000 }),
    ).toEqual({ basePoints: 20, impactPoints: 11, points: 31 });
  });

  it('caps the impact points', () => {
    expect(
      computePoints(rule, { co2SavingsKG: 400, waterSavingsLT: 90000 })
        .impactPoints,
    ).toBe(100);
  });

  it('ignores negative or invalid impact figures', () => {
    expect(
      computePoints(rule, { co2SavingsKG: -5, waterSavingsLT: Number.NaN })
        .points,
    ).toBe(20);
  });

  it('has no cap when maxImpactPoints is null', () => {
    expect(
      computePoints({ ...rule, maxImpactPoints: null }, { co2SavingsKG: 400 })
        .impactPoints,
    ).toBe(400);
  });

  it('gives nothing for an unconfigured activity', () => {
    expect(computePoints(EMPTY_RULE, { co2SavingsKG: 10 }).points).toBe(0);
  });
});

describe('PointsService', () => {
  const p2002 = () =>
    new Prisma.PrismaClientKnownRequestError('dup', {
      code: 'P2002',
      clientVersion: '6',
    });

  function setup() {
    const tx = {
      pointsAward: { create: jest.fn().mockResolvedValue({}) },
      seller: { update: jest.fn().mockResolvedValue({ points: 130 }) },
    };
    const prisma = {
      $transaction: jest.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
      pointsByTransactionKind: {
        findUnique: jest.fn().mockResolvedValue({
          pointsAwarded: 20,
          pointsPerKgCo2: 1,
          pointsPerCubicMeterWater: 1,
          maxImpactPoints: 100,
        }),
      },
      seller: {
        findUnique: jest.fn().mockResolvedValue({
          points: 130,
          sellerLevelId: 1,
          contentLanguage: 'EN',
          sellerLevel: { minPoints: 0 },
        }),
        update: jest.fn().mockResolvedValue({}),
      },
      sellerLevel: {
        findFirst: jest.fn().mockResolvedValue({
          id: 1,
          levelName: 'Semilla',
          minPoints: 0,
          translations: [],
        }),
      },
      sellerLabel: { findMany: jest.fn().mockResolvedValue([]) },
      sellerAchievedLabel: {
        findMany: jest.fn().mockResolvedValue([]),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        create: jest.fn().mockResolvedValue({}),
      },
      pointsAward: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const notifications = { emit: jest.fn().mockResolvedValue(1) };
    const service = new PointsService(
      prisma as unknown as PrismaService,
      notifications as unknown as NotificationsService,
    );
    return { tx, prisma, notifications, service };
  }

  it('records the award, credits the points and returns them', async () => {
    const { tx, service } = setup();

    await expect(
      service.award({
        sellerId: 's1',
        kind: 'PURCHASE',
        reference: 'deal:4',
        co2SavingsKG: 3.8,
        waterSavingsLT: 7000,
      }),
    ).resolves.toBe(31);

    expect(tx.pointsAward.create).toHaveBeenCalledWith({
      data: {
        sellerId: 's1',
        kind: 'PURCHASE',
        reference: 'deal:4',
        points: 31,
        basePoints: 20,
        impactPoints: 11,
        co2SavingsKG: 3.8,
        waterSavingsLT: 7000,
      },
    });
    expect(tx.seller.update).toHaveBeenCalledWith({
      where: { id: 's1' },
      data: { points: { increment: 31 } },
      select: { points: true },
    });
  });

  it('pays a reference once', async () => {
    const { tx, service } = setup();
    tx.pointsAward.create.mockRejectedValue(p2002());

    await expect(
      service.award({ sellerId: 's1', kind: 'PURCHASE', reference: 'deal:4' }),
    ).resolves.toBe(0);
  });

  it('uses a fixed amount for admin grants and deductions', async () => {
    const { tx, service } = setup();

    await expect(
      service.award({
        sellerId: 's1',
        kind: 'BONUS',
        reference: 'admin-grant:x',
        points: -40,
      }),
    ).resolves.toBe(-40);
    expect(tx.seller.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { points: { increment: -40 } } }),
    );
  });

  it('still records an activity nobody configured, at zero points', async () => {
    const { tx, prisma, service } = setup();
    prisma.pointsByTransactionKind.findUnique.mockResolvedValue(null);

    await expect(
      service.award({
        sellerId: 's1',
        kind: 'SERVICE',
        reference: 'booking:2',
      }),
    ).resolves.toBe(0);
    expect(tx.pointsAward.create).toHaveBeenCalled();
  });

  it('moves the seller up a level and tells them, in their language', async () => {
    const { prisma, notifications, service } = setup();
    prisma.sellerLevel.findFirst.mockResolvedValue({
      id: 2,
      levelName: 'Brote',
      minPoints: 100,
      translations: [{ language: 'EN', levelName: 'Sprout' }],
    });

    await service.award({
      sellerId: 's1',
      kind: 'PURCHASE',
      reference: 'deal:4',
    });

    expect(prisma.seller.update).toHaveBeenCalledWith({
      where: { id: 's1' },
      data: { sellerLevelId: 2 },
    });
    expect(notifications.emit).toHaveBeenCalledWith(
      expect.objectContaining({
        sellerId: 's1',
        type: NotificationType.LEVEL_REACHED,
        data: { levelName: 'Sprout', points: 130 },
      }),
    );
  });

  it('moves a seller down without a notification', async () => {
    const { prisma, notifications, service } = setup();
    prisma.seller.findUnique.mockResolvedValue({
      points: 20,
      sellerLevelId: 2,
      contentLanguage: 'ES',
      sellerLevel: { minPoints: 100 },
    });

    await service.updateLevel('s1', 20);

    expect(prisma.seller.update).toHaveBeenCalledWith({
      where: { id: 's1' },
      data: { sellerLevelId: 1 },
    });
    expect(notifications.emit).not.toHaveBeenCalled();
  });

  it('grants a label once the activity count reaches it', async () => {
    const { prisma, notifications, service } = setup();
    prisma.sellerLabel.findMany.mockResolvedValue([
      {
        id: 7,
        labelName: 'Reparador',
        transactionsRequired: 3,
        translations: [{ language: 'EN', labelName: 'Fixer' }],
      },
      {
        id: 8,
        labelName: 'Maestro',
        transactionsRequired: 10,
        translations: [],
      },
    ]);
    prisma.pointsAward.count.mockResolvedValue(3);

    await service.award({
      sellerId: 's1',
      kind: 'REPAIR',
      reference: 'booking:9',
    });

    expect(prisma.sellerAchievedLabel.create).toHaveBeenCalledTimes(1);
    expect(prisma.sellerAchievedLabel.create).toHaveBeenCalledWith({
      data: { sellerId: 's1', labelId: 7, currentCount: 3 },
    });
    expect(notifications.emit).toHaveBeenCalledWith(
      expect.objectContaining({
        type: NotificationType.LABEL_ACHIEVED,
        data: { labelName: 'Fixer' },
      }),
    );
  });

  it('keeps counting on labels already earned without granting them again', async () => {
    const { prisma, service } = setup();
    prisma.sellerLabel.findMany.mockResolvedValue([
      {
        id: 7,
        labelName: 'Reparador',
        transactionsRequired: 3,
        translations: [],
      },
    ]);
    prisma.sellerAchievedLabel.findMany.mockResolvedValue([{ labelId: 7 }]);
    prisma.pointsAward.count.mockResolvedValue(5);

    await service.award({
      sellerId: 's1',
      kind: 'REPAIR',
      reference: 'booking:10',
    });

    expect(prisma.sellerAchievedLabel.create).not.toHaveBeenCalled();
    expect(prisma.sellerAchievedLabel.updateMany).toHaveBeenCalledWith({
      where: { sellerId: 's1', labelId: { in: [7] } },
      data: { currentCount: 5 },
    });
  });

  it('does not fail the award when the level update fails', async () => {
    const { prisma, service } = setup();
    prisma.sellerLevel.findFirst.mockRejectedValue(new Error('db'));

    await expect(
      service.award({ sellerId: 's1', kind: 'PURCHASE', reference: 'order:1' }),
    ).resolves.toBe(20);
  });
});
