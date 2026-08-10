/**
 * Shared chrome for every transactional email Ekoru sends.
 *
 * Templates live in this subgraph (not the gateway) because the decision to
 * send depends on `SellerPreferences`, and that table — along with the seller's
 * email, display name and language — is only in the users database. Other
 * services trigger a send through the internal mutations in
 * `notifications.resolver.ts`.
 */

/** Locales we ship copy for. Anything else falls back to `es`. */
export type MailLocale = 'es' | 'en' | 'fr';

export const DEFAULT_LOCALE: MailLocale = 'es';

export interface RenderedMail {
  subject: string;
  html: string;
  text: string;
}

export type TemplateMap<T> = Record<MailLocale, (data: T) => RenderedMail>;

/**
 * Resolves a template for a locale. Accepts the Prisma `Language` casing
 * ("ES"), the lowercase form ("es"), or anything unknown — all fall back to
 * Spanish rather than throwing, because a missing translation must never
 * swallow a security or transaction notice.
 */
export function pickTemplate<T>(
  map: TemplateMap<T>,
  locale?: string | null,
): (data: T) => RenderedMail {
  const key = (locale ?? '').toLowerCase() as MailLocale;
  return map[key] ?? map[DEFAULT_LOCALE];
}

const BASE_STYLES = `
  body { margin: 0; padding: 0; background-color: #f4f7f4; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; }
  .wrapper { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
  .header { background-color: #2d7a4f; padding: 40px 40px 32px; text-align: center; }
  .header h1 { margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px; }
  .header p { margin: 6px 0 0; color: #a8d5b8; font-size: 14px; }
  .body { padding: 40px; color: #333333; }
  .body h2 { margin: 0 0 16px; font-size: 22px; color: #1a1a1a; }
  .body p { margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #555555; }
  .cta { text-align: center; margin: 32px 0 24px; }
  .cta a { background-color: #2d7a4f; color: #ffffff; text-decoration: none; padding: 14px 36px; border-radius: 6px; font-size: 15px; font-weight: 600; display: inline-block; }
  .cta a.secondary { background-color: #ffffff; color: #2d7a4f; border: 1px solid #2d7a4f; }
  .divider { height: 1px; background: #e8e8e8; margin: 24px 0; }
  .footer { padding: 24px 40px; background: #f9f9f9; text-align: center; }
  .footer p { margin: 0; font-size: 12px; color: #999999; line-height: 1.6; }
  .footer a { color: #2d7a4f; text-decoration: none; }

  /* Key/value block — login device specs, order lines, deal terms. */
  .specs { width: 100%; border-collapse: collapse; margin: 0 0 24px; }
  .specs td { padding: 10px 0; font-size: 14px; line-height: 1.5; border-bottom: 1px solid #f0f0f0; vertical-align: top; }
  .specs td.key { color: #888888; width: 42%; }
  .specs td.val { color: #1a1a1a; font-weight: 600; }
  .specs tr:last-child td { border-bottom: none; }

  /* Status pill for transaction stage. */
  .badge { display: inline-block; padding: 6px 14px; border-radius: 999px; font-size: 12px; font-weight: 700; letter-spacing: 0.4px; text-transform: uppercase; margin: 0 0 16px; }
  .badge.neutral { background: #eef2ee; color: #4a6b55; }
  .badge.progress { background: #fff4e0; color: #9a6412; }
  .badge.success { background: #e6f4ec; color: #1f6b41; }
  .badge.danger { background: #fdecea; color: #a3312a; }

  /* Product card — deal offers show what is on the table. */
  .card { border: 1px solid #e8e8e8; border-radius: 8px; padding: 16px; margin: 0 0 12px; }
  .card .label { margin: 0 0 6px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.4px; color: #888888; }
  .card .title { margin: 0; font-size: 16px; font-weight: 600; color: #1a1a1a; line-height: 1.4; }
  .card .price { margin: 4px 0 0; font-size: 14px; color: #2d7a4f; font-weight: 600; }
  .card img { display: block; width: 100%; max-width: 100%; height: auto; border-radius: 6px; margin: 0 0 12px; }
  .swap { text-align: center; font-size: 20px; color: #b0b0b0; margin: 0 0 12px; }

  /* "This wasn't me" callout on the login alert. */
  .notice { background: #fdf6e3; border-left: 4px solid #d9a441; border-radius: 4px; padding: 16px 18px; margin: 0 0 24px; }
  .notice p { margin: 0; font-size: 14px; line-height: 1.6; color: #6b5320; }
`;

export const APP_BASE_URL = 'https://app.ekoru.cl';
export const SUPPORT_EMAIL = 'contacto@ekoru.cl';

export function buildHtml(content: string, locale: MailLocale): string {
  return `<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>${BASE_STYLES}</style>
</head>
<body>
  <div class="wrapper">
    ${content}
  </div>
</body>
</html>`;
}

/** The green banner every email opens with. */
export function header(tagline: string): string {
  return `
      <div class="header">
        <h1>Ekoru</h1>
        <p>${escapeHtml(tagline)}</p>
      </div>`;
}

/** Closing block. `reason` explains why this particular email was received. */
export function footer(reason: string): string {
  return `
      <div class="footer">
        <p>© ${new Date().getFullYear()} Ekoru · <a href="https://ekoru.cl">ekoru.cl</a></p>
        <p>${escapeHtml(reason)}</p>
      </div>`;
}

/** Renders `[key, value]` pairs as a spec table, skipping empty values. */
export function specTable(rows: Array<[string, string | null | undefined]>) {
  const cells = rows
    .filter(
      ([, value]) => value !== null && value !== undefined && value !== '',
    )
    .map(
      ([key, value]) =>
        `<tr><td class="key">${escapeHtml(key)}</td><td class="val">${escapeHtml(value!)}</td></tr>`,
    )
    .join('');
  return cells ? `<table class="specs">${cells}</table>` : '';
}

// ─── formatting ─────────────────────────────────────────────────────────────

const INTL_LOCALES: Record<MailLocale, string> = {
  es: 'es-CL',
  en: 'en-US',
  fr: 'fr-FR',
};

export function formatAmount(
  amount: number | null | undefined,
  currency: string | null | undefined,
  locale: MailLocale,
): string | null {
  if (typeof amount !== 'number' || Number.isNaN(amount)) return null;
  try {
    return new Intl.NumberFormat(INTL_LOCALES[locale], {
      style: 'currency',
      currency: currency || 'CLP',
      // CLP has no minor unit; Intl already knows, but store products are
      // integer CLP so never show phantom decimals.
      maximumFractionDigits: currency === 'CLP' || !currency ? 0 : 2,
    }).format(amount);
  } catch {
    return `${amount} ${currency ?? ''}`.trim();
  }
}

export function formatDateTime(date: Date, locale: MailLocale): string {
  try {
    return new Intl.DateTimeFormat(INTL_LOCALES[locale], {
      dateStyle: 'long',
      timeStyle: 'short',
      timeZone: 'America/Santiago',
    }).format(date);
  } catch {
    return date.toISOString();
  }
}

/**
 * Every interpolated value in these templates is user-controlled (display
 * names, product titles, user-agent strings), so it is escaped before it
 * reaches the HTML body.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Only http(s) URLs may become links — blocks `javascript:` in hrefs/images. */
export function safeUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:')
      return null;
    return escapeHtml(parsed.toString());
  } catch {
    return null;
  }
}
