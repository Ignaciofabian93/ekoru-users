import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { NotificationPriority, NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsProcessor } from './notifications.processor';
import { NotificationsService } from './notifications.service';
import { NotificationsMetrics } from './notifications.metrics';
import { EmailChannel } from './channels/email.channel';
import { PushChannel } from './channels/push.channel';
import {
  DELIVER_JOB,
  NOTIFICATIONS_QUEUE,
  PURGE_JOB,
  type DeliverJobData,
} from './notifications.queue';

describe('NotificationsProcessor', () => {
  let processor: NotificationsProcessor;
  let findUnique: jest.Mock;
  let email: { send: jest.Mock };
  let push: { send: jest.Mock };
  let metrics: { recordDelivered: jest.Mock; recordFailed: jest.Mock };
  let purgeOldNotifications: jest.Mock;
  let queueAdd: jest.Mock;

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
    metrics = { recordDelivered: jest.fn(), recordFailed: jest.fn() };
    purgeOldNotifications = jest.fn().mockResolvedValue(7);
    queueAdd = jest.fn().mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsProcessor,
        {
          provide: PrismaService,
          useValue: { notification: { findUnique } },
        },
        { provide: EmailChannel, useValue: email },
        { provide: PushChannel, useValue: push },
        { provide: NotificationsService, useValue: { purgeOldNotifications } },
        { provide: NotificationsMetrics, useValue: metrics },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(
              (key: string, fallback?: number) =>
                ({
                  'notifications.retentionDays': 60,
                  'notifications.purgeEveryHours': 24,
                })[key] ?? fallback,
            ),
          },
        },
        {
          provide: getQueueToken(NOTIFICATIONS_QUEUE),
          useValue: { add: queueAdd },
        },
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

  describe('metrics', () => {
    it('counts a delivery per channel, push by messages accepted', async () => {
      await processor.process(job());

      expect(metrics.recordDelivered).toHaveBeenCalledWith('email');
      expect(metrics.recordDelivered).toHaveBeenCalledWith('push', 2);
      expect(metrics.recordFailed).not.toHaveBeenCalled();
    });

    it('counts push with no reachable device as a failure', async () => {
      push.send.mockResolvedValue(0);

      await processor.process(job());

      expect(metrics.recordFailed).toHaveBeenCalledWith(
        'push',
        'no_device_or_rejected',
      );
    });

    it('counts an email the channel could not send', async () => {
      email.send.mockResolvedValue(false);

      await processor.process(job());

      expect(metrics.recordFailed).toHaveBeenCalledWith(
        'email',
        'channel_error',
      );
    });

    it('records nothing for a channel the seller has switched off', async () => {
      findUnique.mockResolvedValue(
        stored({
          seller: {
            ...stored().seller,
            sellerPreferences: {
              ...allOn,
              enableEmailNotifications: false,
              enablePushNotifications: false,
            },
          },
        }),
      );

      await processor.process(job());

      // "Not wanted" must stay distinguishable from "wanted but failed".
      expect(metrics.recordDelivered).not.toHaveBeenCalled();
      expect(metrics.recordFailed).not.toHaveBeenCalled();
    });
  });

  describe('retention', () => {
    it('runs the purge with the configured window', async () => {
      const purgeJob = { name: PURGE_JOB, data: {} } as Job<DeliverJobData>;

      await expect(processor.process(purgeJob)).resolves.toBe(7);
      expect(purgeOldNotifications).toHaveBeenCalledWith(60);
      expect(findUnique).not.toHaveBeenCalled();
    });

    it('schedules the purge with a stable id so redeploys do not stack it', async () => {
      await processor.onModuleInit();

      expect(queueAdd).toHaveBeenCalledWith(
        PURGE_JOB,
        {},
        expect.objectContaining({
          jobId: 'notifications-purge',
          repeat: { every: 24 * 3_600_000 },
        }),
      );
    });

    it('still boots when Redis cannot take the schedule', async () => {
      queueAdd.mockRejectedValue(new Error('redis unreachable'));

      await expect(processor.onModuleInit()).resolves.toBeUndefined();
    });
  });
});
