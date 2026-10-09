import { NotificationType } from '@prisma/client';
import {
  EXPIRY_WARNING_DAYS,
  MembershipExpiryService,
} from './membership-expiry.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

const NOW = new Date('2026-10-09T15:00:00Z');
const DAY = 24 * 60 * 60 * 1000;

const personRow = (over: Record<string, unknown> = {}) => ({
  id: 11,
  sellerId: 'seller-1',
  endDate: new Date(NOW.getTime() - DAY),
  seller: { contentLanguage: 'EN' },
  personMembership: {
    membershipType: 'BASIC',
    translations: [
      { language: 'ES', name: 'Básico' },
      { language: 'EN', name: 'Basic' },
    ],
  },
  ...over,
});

function setup() {
  const prisma = {
    personMembershipSubscription: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(null),
      updateMany: jest.fn().mockReturnValue('person-sub-update'),
    },
    businessMembershipSubscription: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(null),
      updateMany: jest.fn().mockReturnValue('business-sub-update'),
    },
    personProfile: { updateMany: jest.fn().mockReturnValue('person-unlink') },
    businessProfile: {
      updateMany: jest.fn().mockReturnValue('business-unlink'),
    },
    notification: { findFirst: jest.fn().mockResolvedValue(null) },
    $transaction: jest.fn().mockResolvedValue([]),
  };
  const notifications = { emit: jest.fn().mockResolvedValue(1) };
  const service = new MembershipExpiryService(
    prisma as unknown as PrismaService,
    notifications as unknown as NotificationsService,
  );
  return { prisma, notifications, service };
}

describe('MembershipExpiryService (USR-3)', () => {
  it('expires ended terms, unlinks the profile and tells the member', async () => {
    const { prisma, notifications, service } = setup();
    // First findMany = person expiry query; the warn query finds nothing.
    prisma.personMembershipSubscription.findMany
      .mockResolvedValueOnce([personRow()])
      .mockResolvedValueOnce([]);

    await expect(service.sweep(NOW)).resolves.toEqual({
      expired: 1,
      warned: 0,
    });

    expect(
      prisma.personMembershipSubscription.findMany.mock.calls[0][0].where,
    ).toEqual({
      isActive: true,
      endDate: { lte: NOW },
    });
    expect(prisma.personMembershipSubscription.updateMany).toHaveBeenCalledWith(
      {
        where: { id: { in: [11] }, isActive: true },
        data: { isActive: false },
      },
    );
    expect(prisma.personProfile.updateMany).toHaveBeenCalledWith({
      where: { personMembershipSubscriptionId: { in: [11] } },
      data: { personMembershipSubscriptionId: null },
    });
    expect(prisma.$transaction).toHaveBeenCalledWith([
      'person-sub-update',
      'person-unlink',
    ]);
    expect(notifications.emit).toHaveBeenCalledWith({
      sellerId: 'seller-1',
      type: NotificationType.MEMBERSHIP_EXPIRED,
      relatedId: 'person-membership-subscription:11',
      actionUrl: 'https://app.ekoru.cl/en/profile/subscription',
      data: { planName: 'Basic', endDate: expect.stringContaining('2026') },
    });
  });

  it('does not announce the end when the member already renewed', async () => {
    const { prisma, notifications, service } = setup();
    prisma.personMembershipSubscription.findMany
      .mockResolvedValueOnce([personRow()])
      .mockResolvedValueOnce([]);
    prisma.personMembershipSubscription.findFirst.mockResolvedValue({ id: 12 });

    await service.sweep(NOW);

    expect(prisma.personMembershipSubscription.updateMany).toHaveBeenCalled();
    expect(notifications.emit).not.toHaveBeenCalled();
  });

  it('warns once about a term ending within the warning window', async () => {
    const { prisma, notifications, service } = setup();
    const soon = personRow({
      endDate: new Date(NOW.getTime() + 3 * DAY),
      seller: { contentLanguage: 'FR' },
    });
    prisma.personMembershipSubscription.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([soon]);

    await expect(service.sweep(NOW)).resolves.toEqual({
      expired: 0,
      warned: 1,
    });

    expect(
      prisma.personMembershipSubscription.findMany.mock.calls[1][0].where,
    ).toEqual({
      isActive: true,
      endDate: {
        gt: NOW,
        lte: new Date(NOW.getTime() + EXPIRY_WARNING_DAYS * DAY),
      },
    });
    expect(notifications.emit).toHaveBeenCalledWith(
      expect.objectContaining({
        type: NotificationType.MEMBERSHIP_EXPIRING,
        relatedId: 'person-membership-subscription:11',
        actionUrl: 'https://app.ekoru.cl/fr/profile/subscription',
        // No French translation: falls back to the Spanish name.
        data: expect.objectContaining({ planName: 'Básico' }),
      }),
    );
  });

  it('skips a warning that was already sent', async () => {
    const { prisma, notifications, service } = setup();
    prisma.personMembershipSubscription.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        personRow({ endDate: new Date(NOW.getTime() + DAY) }),
      ]);
    prisma.notification.findFirst.mockResolvedValue({ id: 5 });

    await expect(service.sweep(NOW)).resolves.toEqual({
      expired: 0,
      warned: 0,
    });
    expect(notifications.emit).not.toHaveBeenCalled();
  });

  it('handles business terms the same way', async () => {
    const { prisma, notifications, service } = setup();
    prisma.businessMembershipSubscription.findMany
      .mockResolvedValueOnce([
        {
          id: 21,
          sellerId: 'biz-1',
          endDate: new Date(NOW.getTime() - DAY),
          seller: { contentLanguage: 'ES' },
          businessMembership: {
            membershipType: 'EXPERT',
            translations: [{ language: 'ES', name: 'Experto' }],
          },
        },
      ])
      .mockResolvedValueOnce([]);

    await expect(service.sweep(NOW)).resolves.toEqual({
      expired: 1,
      warned: 0,
    });
    expect(prisma.businessProfile.updateMany).toHaveBeenCalledWith({
      where: { businessMembershipSubscriptionId: { in: [21] } },
      data: { businessMembershipSubscriptionId: null },
    });
    expect(notifications.emit).toHaveBeenCalledWith(
      expect.objectContaining({
        sellerId: 'biz-1',
        relatedId: 'business-membership-subscription:21',
        data: expect.objectContaining({ planName: 'Experto' }),
      }),
    );
  });

  it('does nothing when no term is due', async () => {
    const { prisma, notifications, service } = setup();
    await expect(service.sweep(NOW)).resolves.toEqual({
      expired: 0,
      warned: 0,
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(notifications.emit).not.toHaveBeenCalled();
  });
});
