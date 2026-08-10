import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { EmailChannel } from './channels/email.channel';
import { PushChannel } from './channels/push.channel';
import { specFor } from './notification-registry';
import { toLocale } from './notifications.service';
import {
  DELIVER_JOB,
  NOTIFICATIONS_QUEUE,
  type DeliverJobData,
} from './notifications.queue';

/**
 * Fans a stored notification out to the channels its type uses.
 *
 * The in-app row already exists by the time this runs — `emit()` wrote it
 * synchronously. This worker only handles the slow, failure-prone half: SMTP
 * and the Expo push service.
 *
 * Errors are rethrown so BullMQ retries with backoff. Individual channels
 * swallow their own failures, so a reachable-but-broken SMTP host does not
 * cause the push to be re-sent on every attempt.
 */
@Processor(NOTIFICATIONS_QUEUE)
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailChannel,
    private readonly push: PushChannel,
  ) {
    super();
  }

  async process(job: Job<DeliverJobData>): Promise<unknown> {
    if (job.name !== DELIVER_JOB) {
      this.logger.warn(`Unknown notifications job: ${job.name}`);
      return null;
    }
    return this.deliver(job.data.notificationId);
  }

  private async deliver(notificationId: number) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
      select: {
        id: true,
        type: true,
        title: true,
        message: true,
        priority: true,
        relatedId: true,
        actionUrl: true,
        metadata: true,
        sellerId: true,
        seller: {
          select: {
            email: true,
            isActive: true,
            contentLanguage: true,
            sellerPreferences: {
              select: {
                enableEmailNotifications: true,
                enableLoginAlerts: true,
                enablePushNotifications: true,
              },
            },
            personProfile: { select: { displayName: true, firstName: true } },
            businessProfile: { select: { businessName: true } },
          },
        },
      },
    });

    // Deleted between emit and delivery, or the account was deactivated in the
    // meantime — either way there is nobody to reach.
    if (!notification || !notification.seller.isActive) {
      return { emailed: false, pushed: 0 };
    }

    const { seller } = notification;
    const spec = specFor(notification.type);
    const prefs = seller.sellerPreferences;
    const payload = (notification.metadata ?? {}) as Record<string, unknown>;

    // Both preference columns default to false and a missing row counts as
    // opted out, so an unconfigured seller gets in-app only.
    const wantsEmail = !!spec.email && !!prefs?.[spec.emailGate];
    const wantsPush = spec.push && !!prefs?.enablePushNotifications;

    const [emailed, pushed] = await Promise.all([
      wantsEmail && seller.email
        ? this.email.send(
            spec.email!,
            {
              email: seller.email,
              name: displayName(seller),
              locale: toLocale(seller.contentLanguage),
            },
            payload,
          )
        : Promise.resolve(false),

      wantsPush
        ? this.push.send(notification.sellerId, {
            title: notification.title,
            body: notification.message,
            data: {
              notificationId: notification.id,
              type: notification.type,
              relatedId: notification.relatedId,
              actionUrl: notification.actionUrl,
            },
            priority: notification.priority,
          })
        : Promise.resolve(0),
    ]);

    this.logger.log(
      `Notification ${notification.id} (${notification.type}) → email=${emailed} push=${pushed}`,
    );
    return { emailed, pushed };
  }
}

function displayName(seller: {
  personProfile?: { displayName: string | null; firstName: string } | null;
  businessProfile?: { businessName: string } | null;
}): string {
  return (
    seller.personProfile?.displayName ||
    seller.personProfile?.firstName ||
    seller.businessProfile?.businessName ||
    'usuario'
  );
}
