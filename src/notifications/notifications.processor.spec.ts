import { Test, TestingModule } from '@nestjs/testing';
import { Job } from 'bullmq';
import { NotificationPriority, NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsProcessor } from './notifications.processor';
import { EmailChannel } from './channels/email.channel';
import { PushChannel } from './channels/push.channel';
import { DELIVER_JOB, type DeliverJobData } from './notifications.queue';

describe('NotificationsProcessor', () => {
  let processor: NotificationsProcessor;
  let findUnique: jest.Mock;
  let email: { send: jest.Mock };
  let push: { send: jest.Mock };

  const allOn = {
    enableEmailNotifications: true,
    enableLoginAlerts: true,
    enablePushNotifications: true,
  };

  /** A stored notification joined with its recipient, overridable per test. */
  const stored = (overrides: Record<string, unknown> = {}) => ({
    id: 42,
    type: NotificationType.ORDER_RECEIVED,
    title: 'Nueva orden #1042',
    message: 'Se ha iniciado una transacción.',
    priority: NotificationPriority.HIGH,
    relatedId: '1042',
    actionUrl: '/account/orders/1042',
    metadata: { stage: 'STARTED', role: 'BUYER', reference: '#1042' },
    sellerId: 'seller-1',
    seller: {
      email: 'seller@example.com',
      isActive: true,
      contentLanguage: 'ES',
      sellerPreferences: allOn,
      personProfile: { displayName: 'Nacho', firstName: 'Ignacio' },
      businessProfile: null,
    },
    ...overrides,
  });

  const job = (notificationId = 42) =>
    ({ name: DELIVER_JOB, data: { notificationId } }) as Job<DeliverJobData>;

  beforeEach(async () => {
    findUnique = jest.fn().mockResolvedValue(stored());
    email = { send: jest.fn().mockResolvedValue(true) };
    push = { send: jest.fn().mockResolvedValue(2) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsProcessor,
        {
          provide: PrismaService,
          useValue: { notification: { findUnique } },
        },
        { provide: EmailChannel, useValue: email },
        { provide: PushChannel, useValue: push },
      ],
    }).compile();

    processor = module.get(NotificationsProcessor);
  });

  afterEach(() => jest.clearAllMocks());

  describe('preference gate', () => {
    it('sends both channels when everything is enabled', async () => {
      await expect(processor.process(job())).resolves.toEqual({
        emailed: true,
        pushed: 2,
      });
      expect(email.send).toHaveBeenCalledWith(
        'transaction',
        expect.objectContaining({
          email: 'seller@example.com',
          name: 'Nacho',
          locale: 'es',
        }),
        expect.objectContaining({ reference: '#1042' }),
      );
      expect(push.send).toHaveBeenCalled();
    });

    it('skips email when enableEmailNotifications is off', async () => {
      findUnique.mockResolvedValue(
        stored({
          seller: {
            ...stored().seller,
            sellerPreferences: { ...allOn, enableEmailNotifications: false },
          },
        }),
      );

      await expect(processor.process(job())).resolves.toEqual({
        emailed: false,
        pushed: 2,
      });
      expect(email.send).not.toHaveBeenCalled();
    });

    it('skips push when enablePushNotifications is off', async () => {
      findUnique.mockResolvedValue(
        stored({
          seller: {
            ...stored().seller,
            sellerPreferences: { ...allOn, enablePushNotifications: false },
          },
        }),
      );

      await expect(processor.process(job())).resolves.toEqual({
        emailed: true,
        pushed: 0,
      });
      expect(push.send).not.toHaveBeenCalled();
    });

    it('gates a security notice on enableLoginAlerts, not the email switch', async () => {
      findUnique.mockResolvedValue(
        stored({
          type: NotificationType.SECURITY_LOGIN_ALERT,
          seller: {
            ...stored().seller,
            sellerPreferences: {
              ...allOn,
              enableEmailNotifications: false,
              enableLoginAlerts: true,
            },
          },
        }),
      );

      const result = await processor.process(job());
      expect(result).toEqual({ emailed: true, pushed: 2 });
      expect(email.send).toHaveBeenCalledWith(
        'loginAlert',
        expect.anything(),
        expect.anything(),
      );
    });

    it('suppresses the security email when enableLoginAlerts is off', async () => {
      findUnique.mockResolvedValue(
        stored({
          type: NotificationType.SECURITY_LOGIN_ALERT,
          seller: {
            ...stored().seller,
            sellerPreferences: { ...allOn, enableLoginAlerts: false },
          },
        }),
      );

      await expect(processor.process(job())).resolves.toEqual({
        emailed: false,
        pushed: 2,
      });
    });

    it('treats a missing preferences row as opted out of both channels', async () => {
      findUnique.mockResolvedValue(
        stored({
          seller: { ...stored().seller, sellerPreferences: null },
        }),
      );

      await expect(processor.process(job())).resolves.toEqual({
        emailed: false,
        pushed: 0,
      });
    });

    it('sends no email for a type with no email template', async () => {
      findUnique.mockResolvedValue(
        stored({ type: NotificationType.PRODUCT_LIKED }),
      );

      await expect(processor.process(job())).resolves.toEqual({
        emailed: false,
        pushed: 2,
      });
      expect(email.send).not.toHaveBeenCalled();
    });
  });

  describe('delivery', () => {
    it('carries the deep-link data to the device', async () => {
      await processor.process(job());

      expect(push.send).toHaveBeenCalledWith('seller-1', {
        title: 'Nueva orden #1042',
        body: 'Se ha iniciado una transacción.',
        priority: NotificationPriority.HIGH,
        data: {
          notificationId: 42,
          type: NotificationType.ORDER_RECEIVED,
          relatedId: '1042',
          actionUrl: '/account/orders/1042',
        },
      });
    });

    it('does nothing when the notification vanished before delivery', async () => {
      findUnique.mockResolvedValue(null);

      await expect(processor.process(job())).resolves.toEqual({
        emailed: false,
        pushed: 0,
      });
      expect(email.send).not.toHaveBeenCalled();
      expect(push.send).not.toHaveBeenCalled();
    });

    it('does nothing when the account was deactivated after the emit', async () => {
      findUnique.mockResolvedValue(
        stored({ seller: { ...stored().seller, isActive: false } }),
      );

      await expect(processor.process(job())).resolves.toEqual({
        emailed: false,
        pushed: 0,
      });
    });

    it('tolerates an empty metadata payload', async () => {
      findUnique.mockResolvedValue(stored({ metadata: null }));

      await processor.process(job());
      expect(email.send).toHaveBeenCalledWith(
        'transaction',
        expect.anything(),
        {},
      );
    });

    it('rethrows so BullMQ can retry when the lookup fails', async () => {
      findUnique.mockRejectedValue(new Error('db down'));

      await expect(processor.process(job())).rejects.toThrow('db down');
    });

    it('ignores an unknown job name', async () => {
      const unknown = {
        name: 'something-else',
        data: {},
      } as Job<DeliverJobData>;
      await expect(processor.process(unknown)).resolves.toBeNull();
      expect(findUnique).not.toHaveBeenCalled();
    });
  });
});
