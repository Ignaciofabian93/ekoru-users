import { Injectable, Logger } from '@nestjs/common';
import { Language, NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DEFAULT_LOCALE, type MailLocale } from '../mail/templates';
import { SECURITY_TYPES, specFor } from './notification-registry';

export interface RenderedNotification {
  title: string;
  message: string;
}

/** Values available to `{{placeholders}}` in template copy. */
export type TemplateData = Record<string, unknown>;

/**
 * Produces the short title/message pair stored on a `Notification` row and
 * shown in the in-app feed.
 *
 * Resolution order:
 *   1. `NotificationTemplateTranslation` for the seller's language
 *   2. `NotificationTemplate` base copy (the admin's default language)
 *   3. The code fallback in `notification-registry.ts`
 *
 * Steps 1–2 are what admins edit in the panel. Security types skip them
 * entirely — see `SECURITY_TYPES`.
 *
 * Templates are cached in memory for a short window: the feed writes one row
 * per event and would otherwise re-read the same handful of template rows on
 * every emit.
 */
@Injectable()
export class NotificationRenderer {
  private readonly logger = new Logger(NotificationRenderer.name);

  private cache = new Map<
    NotificationType,
    { at: number; value: TemplateRow | null }
  >();
  private static readonly CACHE_TTL_MS = 60_000;

  constructor(private readonly prisma: PrismaService) {}

  async render(
    type: NotificationType,
    locale: MailLocale,
    data: TemplateData,
  ): Promise<RenderedNotification> {
    const fallback =
      specFor(type).fallback[locale] ?? specFor(type).fallback[DEFAULT_LOCALE];

    // Security copy is never admin-editable, so don't even look.
    if (SECURITY_TYPES.has(type)) {
      return {
        title: interpolate(fallback.title, data),
        message: interpolate(fallback.message, data),
      };
    }

    const template = await this.load(type);
    if (!template) {
      return {
        title: interpolate(fallback.title, data),
        message: interpolate(fallback.message, data),
      };
    }

    const translation = template.translations.find(
      (t) => t.language === localeToLanguage(locale),
    );
    const source = translation ?? template;

    return {
      title: interpolate(source.title || fallback.title, data),
      message: interpolate(source.message || fallback.message, data),
    };
  }

  /** Drops the cache — call after an admin edits a template. */
  invalidate(): void {
    this.cache.clear();
  }

  private async load(type: NotificationType): Promise<TemplateRow | null> {
    const cached = this.cache.get(type);
    if (cached && Date.now() - cached.at < NotificationRenderer.CACHE_TTL_MS) {
      return cached.value;
    }

    try {
      const row = await this.prisma.notificationTemplate.findUnique({
        where: { type },
        select: {
          title: true,
          message: true,
          isActive: true,
          translations: {
            select: { language: true, title: true, message: true },
          },
        },
      });
      // An inactive template means "stop using my copy", not "stop notifying".
      const value = row?.isActive ? row : null;
      this.cache.set(type, { at: Date.now(), value });
      return value;
    } catch (error) {
      // A template read must never block a notification.
      this.logger.error(`Template lookup failed for ${type}`, error);
      return null;
    }
  }
}

interface TemplateRow {
  title: string;
  message: string;
  translations: Array<{ language: Language; title: string; message: string }>;
}

/**
 * Replaces `{{key}}` with the matching value from `data`. Unknown or empty
 * placeholders collapse to an empty string rather than leaking `{{note}}` into
 * a user-facing string.
 */
export function interpolate(template: string, data: TemplateData): string {
  return template
    .replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, key: string) => {
      const value = data[key];
      // Payloads arrive as loose JSON, so a placeholder can land on an object
      // or an array. Those collapse to nothing rather than putting
      // "[object Object]" in front of a user.
      if (typeof value === 'string') return value;
      if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
      }
      return '';
    })
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function localeToLanguage(locale: MailLocale): Language {
  return locale.toUpperCase() as Language;
}
