import { Language } from '../graphql/enums';
import { BadRequestError, UnAuthorizedError } from '../common/exceptions';
import type { PrismaService } from '../prisma/prisma.service';
import {
  isUsableTermsContent,
  parseTermsContent,
  TermsBlockKind,
} from './terms-blocks';
import { LegalService, resolveSignUpTerms } from './legal.service';

jest.mock('../common/admin-access', () => ({
  assertAdminCan: jest.fn(
    (_prisma: unknown, { adminId }: { adminId?: string }) => {
      if (!adminId) throw new UnAuthorizedError('admin');
      return Promise.resolve(adminId);
    },
  ),
}));

describe('parseTermsContent', () => {
  it('reads clause titles, sub-clauses, list items and paragraphs', () => {
    const text = [
      '## 1. Introducción',
      '',
      'Primera línea',
      'del mismo párrafo.',
      '',
      'Segundo párrafo.',
      '',
      '## 2. Definiciones',
      '- Plataforma: EKORU.',
      '* Usuario: quien la usa.',
      '### 2.1 Detalle',
      'Texto <b>sin</b> HTML.',
    ].join('\r\n');

    expect(parseTermsContent(text)).toEqual([
      { kind: TermsBlockKind.HEADING, text: '1. Introducción' },
      {
        kind: TermsBlockKind.PARAGRAPH,
        text: 'Primera línea del mismo párrafo.',
      },
      { kind: TermsBlockKind.PARAGRAPH, text: 'Segundo párrafo.' },
      { kind: TermsBlockKind.HEADING, text: '2. Definiciones' },
      { kind: TermsBlockKind.LIST_ITEM, text: 'Plataforma: EKORU.' },
      { kind: TermsBlockKind.LIST_ITEM, text: 'Usuario: quien la usa.' },
      { kind: TermsBlockKind.SUBHEADING, text: '2.1 Detalle' },
      // Kept as text: the clients never render it as HTML.
      { kind: TermsBlockKind.PARAGRAPH, text: 'Texto <b>sin</b> HTML.' },
    ]);
  });

  it('accepts a text only when it has a clause title', () => {
    expect(isUsableTermsContent('## 1. Algo\n\nTexto')).toBe(true);
    expect(isUsableTermsContent('Solo un párrafo')).toBe(false);
    expect(isUsableTermsContent('   ')).toBe(false);
  });
});

function prismaMock() {
  return {
    termsVersion: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    termsVersionTranslation: { deleteMany: jest.fn(), createMany: jest.fn() },
    termsAcceptance: { findFirst: jest.fn(), upsert: jest.fn() },
    $transaction: jest.fn(),
  };
}

const IN_FORCE = { id: 7, version: 2, summary: 'Nueva cláusula 14' };
const ES = Language.ES;

describe('resolveSignUpTerms', () => {
  it('passes a sign-up from an older app build that sends no version', async () => {
    const prisma = prismaMock();
    await expect(
      resolveSignUpTerms(prisma as unknown as PrismaService, undefined, ES),
    ).resolves.toBeNull();
    expect(prisma.termsVersion.findFirst).not.toHaveBeenCalled();
  });

  it('returns the version in force when it is the one ticked', async () => {
    const prisma = prismaMock();
    prisma.termsVersion.findFirst.mockResolvedValue(IN_FORCE);
    await expect(
      resolveSignUpTerms(prisma as unknown as PrismaService, 2, ES),
    ).resolves.toBe(7);
  });

  it('refuses a version that changed while the form was open', async () => {
    const prisma = prismaMock();
    prisma.termsVersion.findFirst.mockResolvedValue(IN_FORCE);
    await expect(
      resolveSignUpTerms(prisma as unknown as PrismaService, 1, ES),
    ).rejects.toBeInstanceOf(BadRequestError);
  });
});

describe('LegalService', () => {
  let prisma: ReturnType<typeof prismaMock>;
  let service: LegalService;

  beforeEach(() => {
    prisma = prismaMock();
    service = new LegalService(prisma as unknown as PrismaService);
  });

  describe('currentTerms', () => {
    const version = {
      version: 2,
      publishedAt: new Date('2026-11-16T12:00:00Z'),
      summary: null,
      translations: [
        { language: 'ES', title: 'Términos', content: '## 1. Uno\n\nTexto' },
        { language: 'EN', title: 'Terms', content: '## 1. One\n\nText' },
      ],
    };

    it('serves the language asked for, as blocks', async () => {
      prisma.termsVersion.findFirst.mockResolvedValue(version);
      const doc = await service.currentTerms(Language.EN);
      expect(doc).toMatchObject({ version: 2, language: 'EN', title: 'Terms' });
      expect(doc?.blocks).toEqual([
        { kind: TermsBlockKind.HEADING, text: '1. One' },
        { kind: TermsBlockKind.PARAGRAPH, text: 'Text' },
      ]);
    });

    it('falls back to Spanish for a language with no text', async () => {
      prisma.termsVersion.findFirst.mockResolvedValue(version);
      await expect(service.currentTerms(Language.DE)).resolves.toMatchObject({
        language: 'ES',
      });
    });

    it('answers null when nothing is published', async () => {
      prisma.termsVersion.findFirst.mockResolvedValue(null);
      await expect(service.currentTerms(ES)).resolves.toBeNull();
    });
  });

  describe('termsStatus', () => {
    it('asks an account that never accepted', async () => {
      prisma.termsVersion.findFirst.mockResolvedValue(IN_FORCE);
      prisma.termsAcceptance.findFirst.mockResolvedValue(null);
      await expect(
        service.termsStatus({ sellerId: 's1', language: ES }),
      ).resolves.toEqual({
        currentVersion: 2,
        acceptedVersion: null,
        mustAccept: true,
        summary: 'Nueva cláusula 14',
      });
    });

    it('asks again after a newer version is published', async () => {
      prisma.termsVersion.findFirst.mockResolvedValue(IN_FORCE);
      prisma.termsAcceptance.findFirst.mockResolvedValue({
        termsVersionId: 3,
        termsVersion: { version: 1 },
      });
      await expect(
        service.termsStatus({ sellerId: 's1', language: ES }),
      ).resolves.toMatchObject({ acceptedVersion: 1, mustAccept: true });
    });

    it('lets through an account that accepted the version in force', async () => {
      prisma.termsVersion.findFirst.mockResolvedValue(IN_FORCE);
      prisma.termsAcceptance.findFirst.mockResolvedValue({
        termsVersionId: 7,
        termsVersion: { version: 2 },
      });
      await expect(
        service.termsStatus({ sellerId: 's1', language: ES }),
      ).resolves.toMatchObject({ mustAccept: false });
    });

    it('needs a signed-in account', async () => {
      await expect(
        service.termsStatus({ language: ES }),
      ).rejects.toBeInstanceOf(UnAuthorizedError);
    });
  });

  describe('acceptTerms', () => {
    it('records the version in force once, as a prompt acceptance', async () => {
      prisma.termsVersion.findFirst.mockResolvedValue(IN_FORCE);
      prisma.termsAcceptance.findFirst.mockResolvedValue({
        termsVersionId: 7,
        termsVersion: { version: 2 },
      });
      await expect(
        service.acceptTerms({ sellerId: 's1', version: 2, language: ES }),
      ).resolves.toMatchObject({ mustAccept: false });
      expect(prisma.termsAcceptance.upsert).toHaveBeenCalledWith({
        where: {
          sellerId_termsVersionId: { sellerId: 's1', termsVersionId: 7 },
        },
        create: { sellerId: 's1', termsVersionId: 7, source: 'PROMPT' },
        update: {},
      });
    });

    it('refuses a version that is no longer in force', async () => {
      prisma.termsVersion.findFirst.mockResolvedValue(IN_FORCE);
      await expect(
        service.acceptTerms({ sellerId: 's1', version: 1, language: ES }),
      ).rejects.toBeInstanceOf(BadRequestError);
      expect(prisma.termsAcceptance.upsert).not.toHaveBeenCalled();
    });
  });

  describe('panel', () => {
    const text = {
      language: Language.ES,
      title: 'Términos',
      content: '## 1. Uno\n\nTexto',
    };

    it('needs an admin', async () => {
      await expect(
        service.termsVersions({ language: ES }),
      ).rejects.toBeInstanceOf(UnAuthorizedError);
    });

    it('refuses a draft without Spanish text or without a clause title', async () => {
      await expect(
        service.saveTermsDraft({
          adminId: 'a1',
          input: { translations: [{ ...text, language: Language.EN }] },
          language: ES,
        }),
      ).rejects.toThrow('El texto en español es obligatorio');
      await expect(
        service.saveTermsDraft({
          adminId: 'a1',
          input: { translations: [{ ...text, content: 'Sin títulos' }] },
          language: ES,
        }),
      ).rejects.toThrow('título de cláusula');
    });

    it('creates the next version as a draft when none is open', async () => {
      prisma.termsVersion.findFirst
        .mockResolvedValueOnce(null) // no open draft
        .mockResolvedValueOnce(IN_FORCE); // in force, for the answer
      const tx = {
        termsVersion: {
          findFirst: jest.fn().mockResolvedValue({ version: 2 }),
          create: jest.fn().mockResolvedValue({ id: 8 }),
        },
        termsVersionTranslation: { createMany: jest.fn() },
      };
      prisma.$transaction.mockImplementation((fn: (t: typeof tx) => unknown) =>
        fn(tx),
      );
      prisma.termsVersion.findUniqueOrThrow.mockResolvedValue({
        id: 8,
        version: 3,
        summary: 'Cambios',
        publishedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        translations: [],
        _count: { acceptances: 0 },
      });

      const saved = await service.saveTermsDraft({
        adminId: 'a1',
        input: { summary: ' Cambios ', translations: [text] },
        language: ES,
      });
      expect(tx.termsVersion.create).toHaveBeenCalledWith({
        data: { version: 3, summary: 'Cambios', createdById: 'a1' },
      });
      expect(tx.termsVersionTranslation.createMany).toHaveBeenCalledWith({
        data: [{ ...text, content: '## 1. Uno\n\nTexto\n', termsVersionId: 8 }],
      });
      expect(saved).toMatchObject({ version: 3, isCurrent: false });
    });

    it('refuses a second draft while one is open', async () => {
      prisma.termsVersion.findFirst.mockResolvedValue({ version: 3 });
      await expect(
        service.saveTermsDraft({
          adminId: 'a1',
          input: { translations: [text] },
          language: ES,
        }),
      ).rejects.toThrow('versión 3');
    });

    it('never changes, publishes or deletes a published version', async () => {
      prisma.termsVersion.findUnique.mockResolvedValue({
        id: 7,
        publishedAt: new Date(),
        translations: [{ language: 'ES' }],
      });
      await expect(
        service.saveTermsDraft({
          adminId: 'a1',
          input: { id: 7, translations: [text] },
          language: ES,
        }),
      ).rejects.toBeInstanceOf(BadRequestError);
      await expect(
        service.publishTermsVersion({ adminId: 'a1', id: 7, language: ES }),
      ).rejects.toBeInstanceOf(BadRequestError);
      await expect(
        service.deleteTermsDraft({ adminId: 'a1', id: 7, language: ES }),
      ).rejects.toBeInstanceOf(BadRequestError);
      expect(prisma.termsVersion.update).not.toHaveBeenCalled();
      expect(prisma.termsVersion.delete).not.toHaveBeenCalled();
    });

    it('publishes a draft with its publisher', async () => {
      prisma.termsVersion.findUnique.mockResolvedValue({
        id: 8,
        publishedAt: null,
        translations: [{ language: 'ES' }],
      });
      prisma.termsVersion.findUniqueOrThrow.mockResolvedValue({
        id: 8,
        version: 3,
        summary: null,
        publishedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        translations: [],
        _count: { acceptances: 0 },
      });
      prisma.termsVersion.findFirst.mockResolvedValue({
        id: 8,
        version: 3,
        summary: null,
      });
      const published = await service.publishTermsVersion({
        adminId: 'a1',
        id: 8,
        language: ES,
      });
      expect(prisma.termsVersion.update).toHaveBeenCalledWith({
        where: { id: 8 },
        data: { publishedAt: expect.any(Date) as Date, publishedById: 'a1' },
      });
      expect(published.isCurrent).toBe(true);
    });
  });
});
