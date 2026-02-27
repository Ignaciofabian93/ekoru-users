import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

type SupportedLocale = 'es' | 'en' | 'fr';
const SUPPORTED: SupportedLocale[] = ['es', 'en', 'fr'];
const DEFAULT_LOCALE: SupportedLocale = 'es';

/**
 * Resolves the user's locale from request headers.
 *
 * Priority:
 *   1. x-language  (e.g. "es-CL", "en-US", "fr")
 *   2. accept-language  (e.g. "es-CL,es;q=0.9,en;q=0.8")
 *
 * The region part is stripped; only the base language code is used.
 * Falls back to 'es' if the language is unsupported or absent.
 */
function resolveLocale(
  headers: Record<string, string | string[] | undefined>,
): SupportedLocale {
  const raw =
    (headers['x-language'] as string | undefined) ||
    (headers['accept-language'] as string | undefined);

  if (!raw) return DEFAULT_LOCALE;

  // Take the first token before any comma (accept-language can be a list)
  const firstTag = raw.split(',')[0].trim();
  // Strip region: "es-CL" → "es"
  const lang = firstTag.split('-')[0].toLowerCase();

  return (
    SUPPORTED.includes(lang as SupportedLocale) ? lang : DEFAULT_LOCALE
  ) as SupportedLocale;
}

export const CurrentLanguage = createParamDecorator(
  (_data: unknown, context: ExecutionContext): SupportedLocale => {
    const ctx = GqlExecutionContext.create(context);
    const req = ctx.getContext<{
      req: { headers: Record<string, string | string[] | undefined> };
    }>().req;
    return resolveLocale(req.headers);
  },
);

export type { SupportedLocale };
