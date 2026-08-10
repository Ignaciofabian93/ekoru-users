/**
 * Seeds `NotificationTemplate` + `NotificationTemplateTranslation` from the
 * fallback copy in `notification-registry.ts`.
 *
 * Why this exists: the registry fallbacks mean notifications work with no rows
 * at all, but an admin then opens the panel to an empty list with nothing to
 * edit. This gives them the current copy as a starting point.
 *
 * Idempotent — safe to re-run. Existing rows are LEFT ALONE, so re-running
 * never overwrites copy an admin has since edited. Pass `--force` to reset
 * everything back to the registry defaults.
 *
 * Security types are deliberately skipped: their copy is hardcoded and the
 * renderer never reads a template for them, so a row here would be an editable
 * surface that silently does nothing.
 *
 * `DATABASE_URL` comes from `.env` via Node's `--env-file`, but a value already
 * in the shell wins — which is how you point this at staging through an SSH
 * tunnel without editing any file:
 *
 *   npm run seed:notification-templates
 *   npm run seed:notification-templates -- --force
 *   DATABASE_URL="postgresql://user:pass@localhost:5433/ekoru" \
 *     npm run seed:notification-templates
 */
import {
  PrismaClient,
  type Language,
  type NotificationType,
} from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

import {
  NOTIFICATION_REGISTRY,
  SECURITY_TYPES,
} from '../src/notifications/notification-registry';
import { DEFAULT_LOCALE, type MailLocale } from '../src/mail/templates/layout';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error(
    'DATABASE_URL is not set. Either run through the npm script (which reads .env)\n' +
      'or pass one explicitly:\n' +
      '  DATABASE_URL="postgresql://…" npm run seed:notification-templates',
  );
  process.exit(1);
}

// Prisma 7 requires a driver adapter — same construction as PrismaService.
const prisma = new PrismaClient({
  errorFormat: 'colorless',
  adapter: new PrismaPg({ connectionString }),
});
const force = process.argv.includes('--force');

const LOCALES: MailLocale[] = ['es', 'en', 'fr'];

async function main() {
  const types = Object.keys(NOTIFICATION_REGISTRY) as NotificationType[];
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const type of types) {
    if (SECURITY_TYPES.has(type)) {
      skipped += 1;
      continue;
    }

    const spec = NOTIFICATION_REGISTRY[type];
    if (!spec) continue;

    // The base row carries the default locale; the rest become translations.
    const base = spec.fallback[DEFAULT_LOCALE];

    const existing = await prisma.notificationTemplate.findUnique({
      where: { type },
      select: { id: true },
    });

    if (existing && !force) {
      skipped += 1;
      continue;
    }

    const template = existing
      ? await prisma.notificationTemplate.update({
          where: { id: existing.id },
          data: { title: base.title, message: base.message },
        })
      : await prisma.notificationTemplate.create({
          data: { type, title: base.title, message: base.message },
        });

    if (existing) updated += 1;
    else created += 1;

    for (const locale of LOCALES) {
      const copy = spec.fallback[locale];
      if (!copy) continue;
      const language = locale.toUpperCase() as Language;

      await prisma.notificationTemplateTranslation.upsert({
        where: {
          notificationTemplateId_language: {
            notificationTemplateId: template.id,
            language,
          },
        },
        create: {
          notificationTemplateId: template.id,
          language,
          title: copy.title,
          message: copy.message,
        },
        // Only overwritten under --force; the plain run never reaches here for
        // an existing template.
        update: { title: copy.title, message: copy.message },
      });
    }
  }

  console.log(
    `Notification templates — created: ${created}, updated: ${updated}, skipped: ${skipped}` +
      (force ? ' (--force: existing copy reset)' : ''),
  );
  console.log(
    'Restart ekoru-users, or edit any template in the admin panel, to clear the copy cache.',
  );
}

main()
  .catch((error) => {
    console.error('Seeding notification templates failed:', error);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());
