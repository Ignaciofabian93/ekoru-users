import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AdminPermission, Language } from '../graphql/enums';
import { assertAdminCan } from '../common/admin-access';
import {
  BadRequestError,
  InternalServerError,
  NotFoundError,
  UnAuthorizedError,
} from '../common/exceptions';
import { legalMessages } from './legal.i18n';
import { isUsableTermsContent, parseTermsContent } from './terms-blocks';
import type { SaveTermsDraftInput } from './dto/save-terms-draft.input';
import type {
  TermsDocument,
  TermsStatus,
  TermsVersionAdmin,
} from './entities/terms.entity';

/** The panel screen that edits the terms is gated by this permission. */
const PERMISSION = AdminPermission.MANAGE_SETTINGS;

/** How an acceptance was given. */
export const TermsAcceptanceSource = {
  SIGN_UP: 'SIGN_UP',
  PROMPT: 'PROMPT',
} as const;

type PrismaLike = Pick<PrismaService, 'termsVersion'>;

/** The published version with the highest number: the one in force. */
export function findTermsInForce(prisma: PrismaLike) {
  return prisma.termsVersion.findFirst({
    where: { publishedAt: { not: null } },
    orderBy: { version: 'desc' },
    select: { id: true, version: true, summary: true },
  });
}

/**
 * The terms version a sign-up accepted (LEG-1), or null when the client sent
 * none: app builds from before LEG-1 have a checkbox but don't send the
 * version, so those accounts are asked at their first visit instead. A version
 * that isn't the one in force (it changed while the form was open) is refused.
 */
export async function resolveSignUpTerms(
  prisma: PrismaLike,
  acceptedVersion: number | null | undefined,
  language: Language,
): Promise<number | null> {
  if (acceptedVersion === undefined || acceptedVersion === null) return null;
  const inForce = await findTermsInForce(prisma);
  if (!inForce || inForce.version !== acceptedVersion) {
    throw new BadRequestError(legalMessages[language].termsChanged);
  }
  return inForce.id;
}

/**
 * Terms and Policies (LEG-1): the version in force for everyone, whether the
 * signed-in account accepted it, recording that acceptance, and the panel's
 * drafts and publishing. A published version never changes.
 */
@Injectable()
export class LegalService {
  private readonly logger = new Logger(LegalService.name);

  constructor(private readonly prisma: PrismaService) {}

  async currentTerms(language: Language): Promise<TermsDocument | null> {
    const t = legalMessages[language];
    try {
      const terms = await this.prisma.termsVersion.findFirst({
        where: { publishedAt: { not: null } },
        orderBy: { version: 'desc' },
        include: { translations: true },
      });
      if (!terms?.publishedAt) return null;
      const text =
        terms.translations.find((x) => x.language === language) ??
        terms.translations.find((x) => x.language === Language.ES) ??
        terms.translations[0];
      if (!text) return null;
      return {
        version: terms.version,
        publishedAt: terms.publishedAt,
        language: text.language,
        title: text.title,
        summary: terms.summary,
        blocks: parseTermsContent(text.content),
      };
    } catch (error) {
      this.logger.error(t.errorLoadTerms, error);
      throw new InternalServerError(t.errorLoadTerms);
    }
  }

  async termsStatus({
    sellerId,
    language,
  }: {
    sellerId?: string;
    language: Language;
  }): Promise<TermsStatus> {
    const t = legalMessages[language];
    if (!sellerId) throw new UnAuthorizedError(t.signInRequired);
    try {
      const [inForce, newest] = await Promise.all([
        findTermsInForce(this.prisma),
        this.prisma.termsAcceptance.findFirst({
          where: { sellerId },
          orderBy: { termsVersion: { version: 'desc' } },
          select: {
            termsVersionId: true,
            termsVersion: { select: { version: true } },
          },
        }),
      ]);
      // Acceptances only point at published versions and the one in force is
      // the highest, so the newest acceptance is it exactly when it was accepted.
      return {
        currentVersion: inForce?.version ?? null,
        acceptedVersion: newest?.termsVersion.version ?? null,
        mustAccept: !!inForce && newest?.termsVersionId !== inForce.id,
        summary: inForce?.summary ?? null,
      };
    } catch (error) {
      this.logger.error(t.errorLoadTerms, error);
      throw new InternalServerError(t.errorLoadTerms);
    }
  }

  /** Records that the signed-in account accepts the version in force. Idempotent. */
  async acceptTerms({
    sellerId,
    version,
    language,
  }: {
    sellerId?: string;
    version: number;
    language: Language;
  }): Promise<TermsStatus> {
    const t = legalMessages[language];
    if (!sellerId) throw new UnAuthorizedError(t.signInRequired);
    const inForce = await findTermsInForce(this.prisma);
    if (!inForce) throw new BadRequestError(t.noTermsInForce);
    if (inForce.version !== version) throw new BadRequestError(t.termsChanged);
    try {
      await this.prisma.termsAcceptance.upsert({
        where: {
          sellerId_termsVersionId: { sellerId, termsVersionId: inForce.id },
        },
        create: {
          sellerId,
          termsVersionId: inForce.id,
          source: TermsAcceptanceSource.PROMPT,
        },
        update: {},
      });
    } catch (error) {
      this.logger.error(t.errorAcceptTerms, error);
      throw new InternalServerError(t.errorAcceptTerms);
    }
    return this.termsStatus({ sellerId, language });
  }

  // ─── Panel ──────────────────────────────────────────────────────────────────

  private assertEditor(adminId: string | undefined, language: Language) {
    const t = legalMessages[language];
    return assertAdminCan(this.prisma, {
      adminId,
      permission: PERMISSION,
      messages: { unauthorized: t.adminUnauthorized, forbidden: t.forbidden },
    });
  }

  async termsVersions({
    adminId,
    language,
  }: {
    adminId?: string;
    language: Language;
  }): Promise<TermsVersionAdmin[]> {
    await this.assertEditor(adminId, language);
    const rows = await this.prisma.termsVersion.findMany({
      orderBy: { version: 'desc' },
      include: {
        translations: { orderBy: { language: 'asc' } },
        _count: { select: { acceptances: true } },
      },
    });
    const current = rows.find((r) => r.publishedAt)?.id;
    return rows.map((r) => this.toAdmin(r, current));
  }

  async saveTermsDraft({
    adminId,
    input,
    language,
  }: {
    adminId?: string;
    input: SaveTermsDraftInput;
    language: Language;
  }): Promise<TermsVersionAdmin> {
    const t = legalMessages[language];
    const editor = await this.assertEditor(adminId, language);

    const languages = input.translations.map((x) => x.language);
    if (new Set(languages).size !== languages.length) {
      throw new BadRequestError(t.duplicateLanguage);
    }
    if (!languages.includes(Language.ES))
      throw new BadRequestError(t.spanishRequired);
    const unusable = input.translations.find(
      (x) => !isUsableTermsContent(x.content),
    );
    if (unusable)
      throw new BadRequestError(t.unusableContent(unusable.language));

    const texts = input.translations.map((x) => ({
      language: x.language,
      title: x.title.trim(),
      content: x.content.replace(/\r\n?/g, '\n').trim() + '\n',
    }));
    const summary = input.summary?.trim() || null;

    let id = input.id;
    if (id !== undefined && id !== null) {
      const draft = await this.prisma.termsVersion.findUnique({
        where: { id },
      });
      if (!draft) throw new NotFoundError(t.versionNotFound);
      if (draft.publishedAt) throw new BadRequestError(t.publishedIsFinal);
    } else {
      const open = await this.prisma.termsVersion.findFirst({
        where: { publishedAt: null },
        select: { version: true },
      });
      if (open) throw new BadRequestError(t.draftAlreadyOpen(open.version));
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        if (id === undefined || id === null) {
          const last = await tx.termsVersion.findFirst({
            orderBy: { version: 'desc' },
            select: { version: true },
          });
          const created = await tx.termsVersion.create({
            data: {
              version: (last?.version ?? 0) + 1,
              summary,
              createdById: editor,
            },
          });
          id = created.id;
        } else {
          await tx.termsVersion.update({ where: { id }, data: { summary } });
          await tx.termsVersionTranslation.deleteMany({
            where: { termsVersionId: id },
          });
        }
        await tx.termsVersionTranslation.createMany({
          data: texts.map((x) => ({ ...x, termsVersionId: id as number })),
        });
      });
    } catch (error) {
      this.logger.error(t.errorSaveTerms, error);
      throw new InternalServerError(t.errorSaveTerms);
    }
    return this.findAdmin(id as number);
  }

  /** Puts a draft in force: from now on everyone signed in is asked to accept it. */
  async publishTermsVersion({
    adminId,
    id,
    language,
  }: {
    adminId?: string;
    id: number;
    language: Language;
  }): Promise<TermsVersionAdmin> {
    const t = legalMessages[language];
    const editor = await this.assertEditor(adminId, language);
    const draft = await this.prisma.termsVersion.findUnique({
      where: { id },
      include: { translations: { select: { language: true } } },
    });
    if (!draft) throw new NotFoundError(t.versionNotFound);
    if (draft.publishedAt) throw new BadRequestError(t.publishedIsFinal);
    if (!draft.translations.some((x) => x.language === Language.ES)) {
      throw new BadRequestError(t.spanishRequired);
    }
    await this.prisma.termsVersion.update({
      where: { id },
      data: { publishedAt: new Date(), publishedById: editor },
    });
    return this.findAdmin(id);
  }

  async deleteTermsDraft({
    adminId,
    id,
    language,
  }: {
    adminId?: string;
    id: number;
    language: Language;
  }): Promise<boolean> {
    const t = legalMessages[language];
    await this.assertEditor(adminId, language);
    const draft = await this.prisma.termsVersion.findUnique({ where: { id } });
    if (!draft) throw new NotFoundError(t.versionNotFound);
    if (draft.publishedAt) throw new BadRequestError(t.publishedIsFinal);
    await this.prisma.termsVersion.delete({ where: { id } });
    return true;
  }

  private async findAdmin(id: number): Promise<TermsVersionAdmin> {
    const [row, current] = await Promise.all([
      this.prisma.termsVersion.findUniqueOrThrow({
        where: { id },
        include: {
          translations: { orderBy: { language: 'asc' } },
          _count: { select: { acceptances: true } },
        },
      }),
      findTermsInForce(this.prisma),
    ]);
    return this.toAdmin(row, current?.id);
  }

  private toAdmin(
    row: {
      id: number;
      version: number;
      summary: string | null;
      publishedAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
      translations: {
        id: number;
        language: string;
        title: string;
        content: string;
      }[];
      _count: { acceptances: number };
    },
    currentId: number | undefined,
  ): TermsVersionAdmin {
    return {
      id: row.id,
      version: row.version,
      summary: row.summary,
      publishedAt: row.publishedAt,
      isCurrent: row.id === currentId,
      acceptanceCount: row._count.acceptances,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      translations: row.translations.map((x) => ({
        ...x,
        language: x.language as Language,
      })),
    };
  }
}
