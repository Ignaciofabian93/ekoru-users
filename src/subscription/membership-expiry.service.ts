import { Injectable, Logger } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  NotificationsService,
  toLocale,
} from '../notifications/notifications.service';
import { APP_BASE_URL, type MailLocale } from '../mail/templates';

/** Warn this many days before a term ends. */
export const EXPIRY_WARNING_DAYS = 7;

/** Rows handled per sweep and kind; the next sweep picks up the rest. */
const BATCH = 500;

const DAY_MS = 24 * 60 * 60 * 1000;

const INTL_LOCALES: Record<MailLocale, string> = {
  es: 'es-CL',
  en: 'en-US',
  fr: 'fr-FR',
};

type Kind = 'person' | 'business';

/** One subscription row, flattened across the person / business split. */
interface TermRow {
  id: number;
  sellerId: string;
  endDate: Date | null;
  contentLanguage: string | null;
  planType: string;
  translations: { language: string; name: string }[];
}

export interface SweepResult {
  expired: number;
  warned: number;
}

/**
 * Ends paid membership terms (USR-3).
 *
 * A term's `endDate` is set when it is bought and was never checked again, so
 * every paid term lasted forever. The sweep runs on a schedule
 * (`MembershipExpiryProcessor`):
 *
 * - Terms past their end date become inactive, and the profile that pointed at
 *   one goes back to the free plan (no linked subscription). The owner gets a
 *   MEMBERSHIP_EXPIRED notification.
 * - Terms ending within a week get one MEMBERSHIP_EXPIRING notification. A
 *   notification with the same `relatedId` marks it as sent, so running the
 *   sweep often never warns twice.
 *
 * Neither notice goes out while the seller already has a later active term
 * (they renewed early): there is nothing for them to do.
 *
 * Both notification types are transactional, so they are emailed whatever the
 * email opt-in says. Auto-renew is not honoured yet: there is no recurring
 * billing (TRX-17), so an auto-renew term ends like any other.
 */
@Injectable()
export class MembershipExpiryService {
  private readonly logger = new Logger(MembershipExpiryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async sweep(now: Date = new Date()): Promise<SweepResult> {
    let expired = 0;
    let warned = 0;
    for (const kind of ['person', 'business'] as const) {
      expired += await this.expire(kind, now);
      warned += await this.warn(kind, now);
    }
    if (expired || warned) {
      this.logger.log(`Membership sweep: ${expired} expired, ${warned} warned`);
    }
    return { expired, warned };
  }

  // ─── Expire ────────────────────────────────────────────────────────────────

  private async expire(kind: Kind, now: Date): Promise<number> {
    const due = await this.findTerms(kind, {
      isActive: true,
      endDate: { lte: now },
    });
    if (!due.length) return 0;

    const ids = due.map((row) => row.id);
    if (kind === 'person') {
      await this.prisma.$transaction([
        this.prisma.personMembershipSubscription.updateMany({
          where: { id: { in: ids }, isActive: true },
          data: { isActive: false },
        }),
        this.prisma.personProfile.updateMany({
          where: { personMembershipSubscriptionId: { in: ids } },
          data: { personMembershipSubscriptionId: null },
        }),
      ]);
    } else {
      await this.prisma.$transaction([
        this.prisma.businessMembershipSubscription.updateMany({
          where: { id: { in: ids }, isActive: true },
          data: { isActive: false },
        }),
        this.prisma.businessProfile.updateMany({
          where: { businessMembershipSubscriptionId: { in: ids } },
          data: { businessMembershipSubscriptionId: null },
        }),
      ]);
    }

    for (const row of due) {
      if (await this.hasLaterActiveTerm(kind, row, now)) continue;
      await this.notify(kind, row, NotificationType.MEMBERSHIP_EXPIRED);
    }
    return due.length;
  }

  // ─── Warn ──────────────────────────────────────────────────────────────────

  private async warn(kind: Kind, now: Date): Promise<number> {
    const horizon = new Date(now.getTime() + EXPIRY_WARNING_DAYS * DAY_MS);
    const soon = await this.findTerms(kind, {
      isActive: true,
      endDate: { gt: now, lte: horizon },
    });

    let warned = 0;
    for (const row of soon) {
      const relatedId = this.relatedId(kind, row.id);
      const alreadySent = await this.prisma.notification.findFirst({
        where: {
          sellerId: row.sellerId,
          type: NotificationType.MEMBERSHIP_EXPIRING,
          relatedId,
        },
        select: { id: true },
      });
      if (alreadySent) continue;
      if (await this.hasLaterActiveTerm(kind, row, now)) continue;
      if (await this.notify(kind, row, NotificationType.MEMBERSHIP_EXPIRING)) {
        warned++;
      }
    }
    return warned;
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private async findTerms(
    kind: Kind,
    where: { isActive: boolean; endDate: { lte?: Date; gt?: Date } },
  ): Promise<TermRow[]> {
    const seller = { select: { contentLanguage: true } };
    if (kind === 'person') {
      const rows = await this.prisma.personMembershipSubscription.findMany({
        where,
        orderBy: { endDate: 'asc' },
        take: BATCH,
        select: {
          id: true,
          sellerId: true,
          endDate: true,
          seller,
          personMembership: {
            select: {
              membershipType: true,
              translations: { select: { language: true, name: true } },
            },
          },
        },
      });
      return rows.map((row) => ({
        id: row.id,
        sellerId: row.sellerId,
        endDate: row.endDate,
        contentLanguage: row.seller?.contentLanguage ?? null,
        planType: row.personMembership.membershipType,
        translations: row.personMembership.translations,
      }));
    }
    const rows = await this.prisma.businessMembershipSubscription.findMany({
      where,
      orderBy: { endDate: 'asc' },
      take: BATCH,
      select: {
        id: true,
        sellerId: true,
        endDate: true,
        seller,
        businessMembership: {
          select: {
            membershipType: true,
            translations: { select: { language: true, name: true } },
          },
        },
      },
    });
    return rows.map((row) => ({
      id: row.id,
      sellerId: row.sellerId,
      endDate: row.endDate,
      contentLanguage: row.seller?.contentLanguage ?? null,
      planType: row.businessMembership.membershipType,
      translations: row.businessMembership.translations,
    }));
  }

  /** Whether the seller holds another active term that outlives this one. */
  private async hasLaterActiveTerm(
    kind: Kind,
    row: TermRow,
    now: Date,
  ): Promise<boolean> {
    const after = row.endDate && row.endDate > now ? row.endDate : now;
    const where = {
      sellerId: row.sellerId,
      isActive: true,
      id: { not: row.id },
      OR: [{ endDate: null }, { endDate: { gt: after } }],
    };
    const later =
      kind === 'person'
        ? await this.prisma.personMembershipSubscription.findFirst({
            where,
            select: { id: true },
          })
        : await this.prisma.businessMembershipSubscription.findFirst({
            where,
            select: { id: true },
          });
    return !!later;
  }

  private relatedId(kind: Kind, id: number): string {
    return `${kind}-membership-subscription:${id}`;
  }

  private async notify(
    kind: Kind,
    row: TermRow,
    type: NotificationType,
  ): Promise<boolean> {
    const locale = toLocale(row.contentLanguage);
    const planName =
      row.translations.find((t) => t.language.toLowerCase() === locale)?.name ??
      row.translations.find((t) => t.language === 'ES')?.name ??
      row.planType;
    const id = await this.notifications.emit({
      sellerId: row.sellerId,
      type,
      relatedId: this.relatedId(kind, row.id),
      actionUrl: `${APP_BASE_URL}/${locale}/profile/subscription`,
      data: {
        planName,
        endDate: row.endDate ? this.formatDate(row.endDate, locale) : '',
      },
    });
    return id !== null;
  }

  private formatDate(date: Date, locale: MailLocale): string {
    return new Intl.DateTimeFormat(INTL_LOCALES[locale], {
      dateStyle: 'long',
      timeZone: 'America/Santiago',
    }).format(date);
  }
}
