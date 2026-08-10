import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  calculatePrismaParams,
  createPaginatedResponse,
} from '../utils/pagination';
import { DEFAULT_LOCALE, type MailLocale } from '../mail/templates';
import { NotificationRenderer } from './notification-renderer';
import { specFor } from './notification-registry';
import {
  DELIVER_JOB,
  NOTIFICATIONS_QUEUE,
  type DeliverJobData,
} from './notifications.queue';

export interface EmitInput {
  /** Who is being notified. */
  sellerId: string;
  type: NotificationType;
  /** Id of the order/deal/message this is about, for deep-linking. */
  relatedId?: string | null;
  actionUrl?: string | null;
  /**
   * Free-form payload. Two jobs: it fills `{{placeholders}}` in the in-app
   * copy, and it carries the richer fields the HTML email templates need. It
   * is persisted to `Notification.metadata`, so the delivery worker can render
   * from it on a retry without the caller still being around.
   */
  data?: Record<string, unknown> | null;
}

/**
 * The single seam every domain event goes through to reach a user.
 *
 * `emit()` does two things synchronously — resolve copy and write the
 * `Notification` row — so the in-app feed is correct the instant the mutation
 * returns. Everything slower (SMTP, Expo) is handed to a BullMQ worker.
 *
 * That split is deliberate: callers get a fast, reliable write, outages in a
 * delivery channel can't touch request latency, retries come from the queue,
 * and the worker can move to its own container later without any caller
 * changing. Which channels a type uses lives in `notification-registry.ts`;
 * nothing here knows about email or push specifically.
 *
 * The in-app row is always written — it is not gated on any preference. A user
 * who muted email still needs to see "action required" when they open the app.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly renderer: NotificationRenderer,
    @InjectQueue(NOTIFICATIONS_QUEUE) private readonly queue: Queue,
  ) {}

  /**
   * Records a notification and schedules its delivery. Returns the new
   * notification id, or `null` when there is nobody to notify.
   *
   * Never throws: a notification is a side effect of the caller's real work,
   * so a failure here must not roll back a completed order or deal.
   */
  async emit(input: EmitInput): Promise<number | null> {
    if (!input.sellerId) return null;

    try {
      const seller = await this.prisma.seller.findUnique({
        where: { id: input.sellerId },
        select: { isActive: true, contentLanguage: true },
      });
      // Deactivated and deleted accounts are not notified through any channel.
      if (!seller?.isActive) return null;

      const locale = toLocale(seller.contentLanguage);
      const data = await this.resolveActor(input.data ?? {});
      const spec = specFor(input.type);
      const { title, message } = await this.renderer.render(
        input.type,
        locale,
        data,
      );

      const notification = await this.prisma.notification.create({
        data: {
          sellerId: input.sellerId,
          type: input.type,
          title,
          message,
          priority: spec.priority,
          relatedId: input.relatedId ?? null,
          actionUrl: input.actionUrl ?? null,
          metadata: data as Prisma.InputJsonValue,
        },
        select: { id: true },
      });

      await this.scheduleDelivery({ notificationId: notification.id });
      return notification.id;
    } catch (error) {
      this.logger.error(
        `emit(${input.type}) failed for seller ${input.sellerId}`,
        error,
      );
      return null;
    }
  }

  // ─── feed ─────────────────────────────────────────────────────────────────

  async myNotifications({
    sellerId,
    page,
    pageSize,
    onlyUnread,
  }: {
    sellerId: string;
    page: number;
    pageSize: number;
    onlyUnread: boolean;
  }) {
    const where = { sellerId, ...(onlyUnread ? { isRead: false } : {}) };
    const { skip, take } = calculatePrismaParams(page, pageSize);

    const [nodes, totalCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return createPaginatedResponse(nodes, totalCount, page, pageSize);
  }

  unreadCount(sellerId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { sellerId, isRead: false },
    });
  }

  /**
   * Marks one notification read. Scoped by `sellerId` so a guessed id can't
   * touch someone else's feed; a miss is a no-op rather than an error.
   */
  async markRead(sellerId: string, id: number): Promise<boolean> {
    const { count } = await this.prisma.notification.updateMany({
      where: { id, sellerId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return count > 0;
  }

  /** Marks every unread notification read. Returns how many changed. */
  async markAllRead(sellerId: string): Promise<number> {
    const { count } = await this.prisma.notification.updateMany({
      where: { sellerId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return count;
  }

  // ─── helpers ──────────────────────────────────────────────────────────────

  /**
   * Turns `actorSellerId` — the other person in the event — into a display
   * name under `actorName`, which templates and emails then interpolate.
   *
   * Profiles live in this database, so callers reference the actor by id and
   * never need a round trip just to address a notification. Resolving here
   * (rather than in a channel) means the name is stored on the row, so the
   * feed, the email and a retry hours later all show the same thing.
   */
  private async resolveActor(
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const actorId = data.actorSellerId;
    if (typeof actorId !== 'string' || !actorId) return data;

    const actor = await this.prisma.seller.findUnique({
      where: { id: actorId },
      select: {
        personProfile: { select: { displayName: true, firstName: true } },
        businessProfile: { select: { businessName: true } },
      },
    });

    return {
      ...data,
      actorName:
        actor?.personProfile?.displayName ||
        actor?.personProfile?.firstName ||
        actor?.businessProfile?.businessName ||
        'Un usuario de Ekoru',
    };
  }

  /**
   * Hands delivery to the queue. If Redis is unreachable the notification is
   * already safely in the feed, so this degrades to "in-app only" rather than
   * failing the emit.
   */
  private async scheduleDelivery(job: DeliverJobData): Promise<void> {
    try {
      await this.queue.add(DELIVER_JOB, job, {
        attempts: 4,
        backoff: { type: 'exponential', delay: 5_000 },
        removeOnComplete: 200,
        removeOnFail: 1_000,
      });
    } catch (error) {
      this.logger.error(
        `Could not queue delivery for notification ${job.notificationId} — it stays in-app only`,
        error,
      );
    }
  }
}

/** Prisma `Language` (ES/EN/FR/PT/DE) → a locale we have copy for. */
export function toLocale(language: string | null | undefined): MailLocale {
  const lower = (language ?? '').toLowerCase();
  return lower === 'es' || lower === 'en' || lower === 'fr'
    ? lower
    : DEFAULT_LOCALE;
}
