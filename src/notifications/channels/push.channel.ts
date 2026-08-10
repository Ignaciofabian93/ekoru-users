import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationPriority } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

/** Expo rejects batches larger than this. */
const MAX_BATCH = 100;

interface ExpoTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
}

export interface PushMessage {
  title: string;
  body: string;
  /** Delivered to the app so it can deep-link; keep it small. */
  data?: Record<string, unknown>;
  priority: NotificationPriority;
}

/**
 * Delivers push notifications to the Expo push service, which fans out to APNs
 * and FCM on our behalf.
 *
 * Expo's HTTP API is a single JSON POST, so there is no SDK dependency here.
 * `EXPO_ACCESS_TOKEN` is optional and only needed once push security is
 * enabled in the Expo project.
 *
 * The important half of this class is the response handling: Expo replies with
 * one ticket per message, and a `DeviceNotRegistered` ticket means the token is
 * dead (app uninstalled, or reissued elsewhere). Those are deactivated
 * immediately — otherwise the dead-token set grows forever and every send gets
 * slower and noisier.
 */
@Injectable()
export class PushChannel {
  private readonly logger = new Logger(PushChannel.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Sends to every active device of a seller. Returns the number of messages
   * Expo accepted. Never throws.
   */
  async send(sellerId: string, message: PushMessage): Promise<number> {
    const devices = await this.prisma.sellerDevice.findMany({
      where: { sellerId, isActive: true },
      select: { pushToken: true },
    });
    if (devices.length === 0) return 0;

    const tokens = devices.map((d) => d.pushToken);
    let accepted = 0;

    for (let i = 0; i < tokens.length; i += MAX_BATCH) {
      accepted += await this.sendBatch(tokens.slice(i, i + MAX_BATCH), message);
    }
    return accepted;
  }

  private async sendBatch(
    tokens: string[],
    message: PushMessage,
  ): Promise<number> {
    const body = tokens.map((to) => ({
      to,
      title: message.title,
      body: message.body,
      data: message.data ?? {},
      sound: 'default',
      // Expo's own priority vocabulary, not ours.
      priority:
        message.priority === NotificationPriority.HIGH ||
        message.priority === NotificationPriority.URGENT
          ? 'high'
          : 'normal',
    }));

    let tickets: ExpoTicket[];
    try {
      const accessToken = this.config.get<string>('push.expoAccessToken');
      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        this.logger.error(
          `Expo push returned ${response.status}: ${await response.text()}`,
        );
        return 0;
      }

      const parsed = (await response.json()) as { data?: ExpoTicket[] };
      tickets = parsed.data ?? [];
    } catch (error) {
      this.logger.error('Expo push unreachable', error);
      return 0;
    }

    // Tickets come back positionally, one per token.
    const dead: string[] = [];
    let accepted = 0;
    tickets.forEach((ticket, index) => {
      if (ticket.status === 'ok') {
        accepted += 1;
        return;
      }
      if (ticket.details?.error === 'DeviceNotRegistered') {
        dead.push(tokens[index]);
      } else {
        this.logger.warn(
          `Expo push rejected a message: ${ticket.details?.error ?? ticket.message ?? 'unknown'}`,
        );
      }
    });

    if (dead.length > 0) await this.deactivate(dead);
    return accepted;
  }

  /** Retires tokens Expo told us are no longer deliverable. */
  private async deactivate(tokens: string[]): Promise<void> {
    try {
      await this.prisma.sellerDevice.updateMany({
        where: { pushToken: { in: tokens } },
        data: { isActive: false },
      });
      this.logger.log(`Deactivated ${tokens.length} unregistered device(s)`);
    } catch (error) {
      this.logger.error('Failed to deactivate dead push tokens', error);
    }
  }
}
