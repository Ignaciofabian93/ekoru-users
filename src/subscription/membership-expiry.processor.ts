import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import {
  BeforeApplicationShutdown,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { MembershipExpiryService } from './membership-expiry.service';
import { purgeExpiredRefreshTokens } from './refresh-token-cleanup';
import {
  EXPIRY_SWEEP_EVERY_MS,
  EXPIRY_SWEEP_JOB,
  MEMBERSHIPS_QUEUE,
} from './membership-expiry.queue';

/**
 * Runs the membership term sweep on a schedule (USR-3). A stable `jobId` means
 * a redeploy replaces the schedule instead of stacking a second one, and only
 * one worker picks up each run however many replicas are up.
 */
@Processor(MEMBERSHIPS_QUEUE)
export class MembershipExpiryProcessor
  extends WorkerHost
  implements OnModuleInit, BeforeApplicationShutdown
{
  private readonly logger = new Logger(MembershipExpiryProcessor.name);
  /** So a missing grant is logged once per start, not every hour. */
  private cleanupFailureLogged = false;

  constructor(
    private readonly expiry: MembershipExpiryService,
    @InjectQueue(MEMBERSHIPS_QUEUE) private readonly queue: Queue,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.queue.add(
        EXPIRY_SWEEP_JOB,
        {},
        {
          repeat: { every: EXPIRY_SWEEP_EVERY_MS },
          jobId: 'membership-expiry-sweep',
          removeOnComplete: true,
          removeOnFail: 20,
        },
      );
      this.logger.log(
        `Membership expiry sweep scheduled every ${EXPIRY_SWEEP_EVERY_MS / 60_000} min`,
      );
    } catch (error) {
      // Redis down at boot must not stop the service starting; the next
      // deploy (or restart) schedules it again.
      this.logger.error(
        'Could not schedule the membership expiry sweep',
        error,
      );
    }
  }

  /**
   * On shutdown, waits for the job in progress before anything else closes:
   * Prisma and Redis close later, in onApplicationShutdown.
   */
  async beforeApplicationShutdown(): Promise<void> {
    await this.worker.close();
  }

  async process(job: Job): Promise<unknown> {
    if (job.name !== EXPIRY_SWEEP_JOB) {
      this.logger.warn(`Unknown memberships job: ${job.name}`);
      return null;
    }
    const result = await this.expiry.sweep();
    await this.clearOldRefreshTokens();
    return result;
  }

  /**
   * Housekeeping that rides on the hourly run (GW-7). It never fails the
   * sweep: until the `ekoru_users` role is granted DELETE on RefreshToken
   * (`npm run db-roles:apply` in the root) the database refuses it.
   */
  private async clearOldRefreshTokens(): Promise<void> {
    try {
      const deleted = await purgeExpiredRefreshTokens(this.prisma);
      if (deleted > 0) {
        this.logger.log(`Deleted ${deleted} expired refresh tokens`);
      }
    } catch (error) {
      if (this.cleanupFailureLogged) return;
      this.cleanupFailureLogged = true;
      this.logger.warn(
        `Could not delete expired refresh tokens: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
