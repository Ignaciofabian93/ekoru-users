import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, OnModuleInit } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { MembershipExpiryService } from './membership-expiry.service';
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
  implements OnModuleInit
{
  private readonly logger = new Logger(MembershipExpiryProcessor.name);

  constructor(
    private readonly expiry: MembershipExpiryService,
    @InjectQueue(MEMBERSHIPS_QUEUE) private readonly queue: Queue,
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

  async process(job: Job): Promise<unknown> {
    if (job.name !== EXPIRY_SWEEP_JOB) {
      this.logger.warn(`Unknown memberships job: ${job.name}`);
      return null;
    }
    return this.expiry.sweep();
  }
}
