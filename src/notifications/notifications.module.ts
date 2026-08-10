import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { MailModule } from '../mail/mail.module';
import { NotificationsService } from './notifications.service';
import { NotificationsResolver } from './notifications.resolver';
import { NotificationRenderer } from './notification-renderer';
import { NotificationsProcessor } from './notifications.processor';
import { DevicesService } from './devices.service';
import { EmailChannel } from './channels/email.channel';
import { PushChannel } from './channels/push.channel';
import { NOTIFICATIONS_QUEUE } from './notifications.queue';

/**
 * Every notification the platform sends passes through here.
 *
 * `NotificationsService.emit()` is the seam: it writes the in-app row
 * synchronously, then queues delivery. `NotificationsProcessor` consumes that
 * queue and fans out to the channels in `channels/` according to
 * `notification-registry.ts` and the recipient's `SellerPreferences`.
 *
 * Registering the queue here covers both sides — this module produces jobs
 * (service) and consumes them (processor). If the worker is ever split into
 * its own container, the processor moves and nothing else changes.
 */
@Module({
  imports: [
    MailModule, // EmailChannel renders through the existing mail templates
    BullModule.registerQueue({ name: NOTIFICATIONS_QUEUE }),
  ],
  providers: [
    NotificationsService,
    NotificationsResolver,
    NotificationRenderer,
    NotificationsProcessor,
    DevicesService,
    EmailChannel,
    PushChannel,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
