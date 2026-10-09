import { Injectable, Logger } from '@nestjs/common';
import { MailService } from '../../mail/mail.service';
import { parseUserAgent } from '../../mail/user-agent';
import type {
  DealOfferData,
  LoginAlertData,
  NoticeData,
  TransactionData,
} from '../../mail/templates';
import type { EmailKind } from '../notification-registry';

/** Everything the channel needs about the recipient. */
export interface EmailRecipient {
  email: string;
  name: string;
  locale: string;
}

/** The notification as the feed shows it, for the generic `notice` email. */
export interface RenderedNotification {
  title: string;
  message: string;
  actionUrl?: string | null;
}

/**
 * Renders a notification as an HTML email.
 *
 * The email templates need richer, differently-shaped data than the one-line
 * in-app copy, so they read the emit payload (persisted on
 * `Notification.metadata`) rather than the rendered title/message. This class
 * is the only place that knows how a payload maps onto a template.
 *
 * Payloads arrive as loose JSON — they crossed a service boundary and came back
 * out of a `Json` column — so every field is narrowed here rather than trusted.
 */
@Injectable()
export class EmailChannel {
  private readonly logger = new Logger(EmailChannel.name);

  constructor(private readonly mailService: MailService) {}

  async send(
    kind: EmailKind,
    recipient: EmailRecipient,
    payload: Record<string, unknown>,
    rendered?: RenderedNotification,
  ): Promise<boolean> {
    try {
      switch (kind) {
        case 'notice':
          return await this.sendNotice(recipient, rendered);
        case 'loginAlert':
          return await this.sendLoginAlert(recipient, payload);
        case 'transaction':
          return await this.sendTransaction(recipient, payload);
        case 'dealOffer':
          return await this.sendDealOffer(recipient, payload);
      }
    } catch (error) {
      this.logger.error(`Email channel (${kind}) failed`, error);
      return false;
    }
  }

  private async sendNotice(
    recipient: EmailRecipient,
    rendered?: RenderedNotification,
  ): Promise<boolean> {
    if (!rendered?.title || !rendered.message) {
      this.logger.warn('Notice email skipped — no rendered title/message');
      return false;
    }
    const data: NoticeData = {
      name: recipient.name,
      title: rendered.title,
      message: rendered.message,
      actionUrl: rendered.actionUrl ?? null,
    };
    await this.mailService.sendNoticeEmail({
      email: recipient.email,
      locale: recipient.locale,
      data,
    });
    return true;
  }

  private async sendLoginAlert(
    recipient: EmailRecipient,
    payload: Record<string, unknown>,
  ): Promise<boolean> {
    const { browser, operatingSystem, deviceKind } = parseUserAgent(
      str(payload.userAgent),
    );
    const data: LoginAlertData = {
      name: recipient.name,
      browser,
      operatingSystem,
      deviceKind,
      userAgent: str(payload.userAgent),
      ipAddress: str(payload.ipAddress),
      location: str(payload.location),
      occurredAt: date(payload.occurredAt) ?? new Date(),
    };
    await this.mailService.sendLoginAlertEmail({
      email: recipient.email,
      locale: recipient.locale,
      data,
    });
    return true;
  }

  private async sendTransaction(
    recipient: EmailRecipient,
    payload: Record<string, unknown>,
  ): Promise<boolean> {
    const stage = str(payload.stage);
    const role = str(payload.role);
    if (!isStage(stage) || !isRole(role)) {
      this.logger.warn(
        `Transaction email skipped — bad stage/role (${stage}/${role})`,
      );
      return false;
    }

    const data: TransactionData = {
      name: recipient.name,
      stage,
      role,
      reference: str(payload.reference) ?? '',
      summary: str(payload.summary) ?? '',
      amount: num(payload.amount),
      currency: str(payload.currency),
      counterpartName: str(payload.counterpartName),
      note: str(payload.note),
      detailUrl: str(payload.detailUrl),
    };
    await this.mailService.sendTransactionEmail({
      email: recipient.email,
      locale: recipient.locale,
      data,
    });
    return true;
  }

  private async sendDealOffer(
    recipient: EmailRecipient,
    payload: Record<string, unknown>,
  ): Promise<boolean> {
    const dealKind = str(payload.dealKind);
    if (dealKind !== 'SALE' && dealKind !== 'EXCHANGE') {
      this.logger.warn(`Deal offer email skipped — bad dealKind (${dealKind})`);
      return false;
    }

    const data: DealOfferData = {
      name: recipient.name,
      // `actorSellerId` was resolved to a display name by emit(), before the
      // notification row was written.
      offererName: str(payload.actorName) ?? 'Un usuario de Ekoru',
      dealKind,
      requestedProductTitle: str(payload.requestedProductTitle) ?? '',
      requestedProductImage: str(payload.requestedProductImage),
      requestedProductPrice: num(payload.requestedProductPrice),
      offeredProductTitle: str(payload.offeredProductTitle),
      offeredProductImage: str(payload.offeredProductImage),
      offeredProductPrice: num(payload.offeredProductPrice),
      message: str(payload.message),
      compensationAmount: num(payload.compensationAmount),
      compensationPaidByRecipient: payload.compensationPaidByRecipient === true,
      currency: str(payload.currency),
      dealUrl: str(payload.dealUrl),
    };
    await this.mailService.sendDealOfferEmail({
      email: recipient.email,
      locale: recipient.locale,
      data,
    });
    return true;
  }
}

// ─── narrowing helpers ───────────────────────────────────────────────────────

function str(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function date(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (typeof value !== 'string') return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

const STAGES = [
  'STARTED',
  'IN_PROCESS',
  'COMPLETED',
  'CANCELLED',
  'REFUNDED',
] as const;

function isStage(value: string | null): value is TransactionData['stage'] {
  return !!value && (STAGES as readonly string[]).includes(value);
}

function isRole(value: string | null): value is TransactionData['role'] {
  return value === 'BUYER' || value === 'SELLER';
}
