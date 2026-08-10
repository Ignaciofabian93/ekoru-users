import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import { Counter, Gauge, register } from 'prom-client';

import { NOTIFICATIONS_QUEUE } from './notifications.queue';

const DEPTH_METRIC = 'ekoru_notifications_queue_depth';
const DELIVERED_METRIC = 'ekoru_notifications_delivered_total';
const FAILED_METRIC = 'ekoru_notifications_failed_total';

export type DeliveryChannel = 'email' | 'push';

/**
 * Prometheus instrumentation for notification delivery.
 *
 * Queue depth is read at **scrape time** via prom-client's `collect` hook
 * rather than being written after each job. That distinction matters: the
 * failure you most want to catch is the worker being dead or wedged, and in
 * that state no job runs, so a gauge updated from inside the worker would sit
 * frozen at its last healthy value while the backlog grew.
 *
 * The counters are the other half — they say whether deliveries are actually
 * landing, split by channel, which a queue that drains to zero cannot tell you
 * (a job that "succeeded" having sent nothing still drains).
 */
@Injectable()
export class NotificationsMetrics implements OnModuleInit {
  private readonly logger = new Logger(NotificationsMetrics.name);

  private delivered?: Counter<'channel'>;
  private failed?: Counter<'channel' | 'reason'>;

  constructor(
    @InjectQueue(NOTIFICATIONS_QUEUE) private readonly queue: Queue,
  ) {}

  onModuleInit(): void {
    const queue = this.queue;
    const logger = this.logger;

    // Nest can instantiate a module twice under watch-mode reloads, and
    // prom-client throws on a duplicate metric name.
    register.removeSingleMetric(DEPTH_METRIC);
    register.removeSingleMetric(DELIVERED_METRIC);
    register.removeSingleMetric(FAILED_METRIC);

    new Gauge({
      name: DEPTH_METRIC,
      help: 'Notification delivery jobs in the queue, by state',
      labelNames: ['state'] as const,
      async collect() {
        try {
          const counts = await queue.getJobCounts(
            'waiting',
            'active',
            'delayed',
            'failed',
          );
          for (const [state, value] of Object.entries(counts)) {
            this.set({ state }, value ?? 0);
          }
        } catch (error) {
          // Redis unreachable: report nothing rather than a stale number, so
          // the series gaps instead of lying.
          this.reset();
          logger.warn(`Queue depth unavailable: ${String(error)}`);
        }
      },
    });

    this.delivered = new Counter({
      name: DELIVERED_METRIC,
      help: 'Notifications successfully handed to a delivery channel',
      labelNames: ['channel'] as const,
    });

    this.failed = new Counter({
      name: FAILED_METRIC,
      help: 'Notifications a delivery channel could not send',
      labelNames: ['channel', 'reason'] as const,
    });
  }

  recordDelivered(channel: DeliveryChannel, count = 1): void {
    if (count > 0) this.delivered?.inc({ channel }, count);
  }

  recordFailed(channel: DeliveryChannel, reason: string): void {
    this.failed?.inc({ channel, reason });
  }
}
