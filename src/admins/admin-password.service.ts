import { Injectable, Logger } from '@nestjs/common';
import { hash } from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import type { MailLocale } from '../mail/templates';
import { toLocale } from '../notifications/notifications.service';
import { BadRequestError, InternalServerError } from '../common/exceptions';
import { Language } from '../graphql/enums';
import { teamMessages } from './business-team.i18n';

/**
 * An invite waits longer than a reset: a business owner may open it days after
 * paying. If it lapses, "forgot password" sends a fresh one.
 */
const INVITE_TTL_HOURS = 72;
const RESET_TTL_MINUTES = 60;

/** Repeat reset requests inside this window are accepted but not emailed. */
const RESET_RESEND_COOLDOWN_MS = 60_000;

const MIN_PASSWORD_LENGTH = 8;

const HOURS: Record<MailLocale, string> = {
  es: 'horas',
  en: 'hours',
  fr: 'heures',
};
const MINUTES: Record<MailLocale, string> = {
  es: 'minutos',
  en: 'minutes',
  fr: 'minutes',
};

/** Only the digest is stored; the plaintext exists once, in the email. */
export function hashAdminToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** A password nobody knows, for an account whose owner sets it from the email. */
export async function unusablePassword(): Promise<string> {
  return hash(randomBytes(32).toString('hex'), 10);
}

/**
 * One-time links into the admin panel to choose a password (USR-15). A new
 * business owner or team member gets an invite; anyone can ask for a reset from
 * the panel's login. Mirrors the sellers' reset flow (account.service): a link
 * replaces every earlier one, works once, and choosing the password ends the
 * account's other sessions.
 */
@Injectable()
export class AdminPasswordService {
  private readonly logger = new Logger(AdminPasswordService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  /**
   * Issues a fresh link and emails it. Invites go out in the business's
   * language; resets in the panel's. Returns whether SMTP accepted it.
   */
  async sendLink({
    adminId,
    kind,
    language,
  }: {
    adminId: string;
    kind: 'invite' | 'reset';
    language?: Language | null;
  }): Promise<boolean> {
    const admin = await this.prisma.admin.findUnique({
      where: { id: adminId },
      select: {
        id: true,
        email: true,
        name: true,
        seller: {
          select: {
            contentLanguage: true,
            businessProfile: { select: { businessName: true } },
          },
        },
      },
    });
    if (!admin) return false;

    const token = randomBytes(32).toString('hex');
    const ttlMs =
      kind === 'invite'
        ? INVITE_TTL_HOURS * 60 * 60 * 1000
        : RESET_TTL_MINUTES * 60 * 1000;
    await this.prisma.$transaction([
      this.prisma.adminPasswordToken.deleteMany({ where: { adminId } }),
      this.prisma.adminPasswordToken.create({
        data: {
          adminId,
          tokenHash: hashAdminToken(token),
          expiresAt: new Date(Date.now() + ttlMs),
        },
      }),
    ]);

    const locale = toLocale(language ?? admin.seller?.contentLanguage);
    const panel = this.mailService.adminPanelUrl();
    const sent = await this.mailService.sendAdminAccessEmail({
      email: admin.email,
      locale,
      data: {
        kind,
        name: admin.name,
        businessName: admin.seller?.businessProfile?.businessName ?? null,
        email: admin.email,
        url: `${panel}/${locale}/set-password?token=${token}`,
        loginUrl: `${panel}/${locale}/login`,
        expiresIn:
          kind === 'invite'
            ? `${INVITE_TTL_HOURS} ${HOURS[locale]}`
            : `${RESET_TTL_MINUTES} ${MINUTES[locale]}`,
      },
    });
    if (!sent) {
      this.logger.error(`Admin ${kind} email not delivered for ${adminId}`);
    }
    return sent;
  }

  /**
   * The panel's "forgot password". Always resolves true, so the answer never
   * tells a stranger whether an address has a panel account.
   */
  async requestReset({
    email,
    language,
  }: {
    email: string;
    language: Language;
  }): Promise<boolean> {
    const t = teamMessages[language];
    try {
      const admin = await this.prisma.admin.findUnique({
        where: { email: email.trim().toLowerCase() },
        select: { id: true, isActive: true, accountLocked: true },
      });
      if (!admin?.isActive || admin.accountLocked) return true;

      const recentlySent = await this.prisma.adminPasswordToken.findFirst({
        where: {
          adminId: admin.id,
          usedAt: null,
          createdAt: { gt: new Date(Date.now() - RESET_RESEND_COOLDOWN_MS) },
        },
        select: { id: true },
      });
      if (recentlySent) return true;

      await this.sendLink({ adminId: admin.id, kind: 'reset', language });
      return true;
    } catch (error) {
      this.logger.error('Error requesting an admin password link:', error);
      throw new InternalServerError(t.errorRequestReset);
    }
  }

  /**
   * Exchanges a valid link for a password. Claiming the token, writing the
   * hash and ending the other sessions happen in one transaction.
   */
  async setPassword({
    token,
    newPassword,
    language,
  }: {
    token: string;
    newPassword: string;
    language: Language;
  }): Promise<boolean> {
    const t = teamMessages[language];
    try {
      if (newPassword.length < MIN_PASSWORD_LENGTH) {
        throw new BadRequestError(t.weakPassword);
      }
      const record = await this.prisma.adminPasswordToken.findUnique({
        where: { tokenHash: hashAdminToken(token) },
      });
      if (!record || record.usedAt) throw new BadRequestError(t.invalidToken);
      if (record.expiresAt.getTime() <= Date.now()) {
        throw new BadRequestError(t.expiredToken);
      }

      const passwordHash = await hash(newPassword, 10);
      await this.prisma.$transaction(async (tx) => {
        // Only one of two parallel submissions of the same link can win.
        const claimed = await tx.adminPasswordToken.updateMany({
          where: { id: record.id, usedAt: null },
          data: { usedAt: new Date() },
        });
        if (claimed.count === 0) throw new BadRequestError(t.invalidToken);

        // The email proved the address. A manual lock stays as EKORU set it.
        await tx.admin.update({
          where: { id: record.adminId },
          data: {
            password: passwordHash,
            isEmailVerified: true,
            loginAttempts: 0,
          },
        });
        // RefreshToken is the gateway's table, absent from this client.
        await tx.$executeRaw`
          UPDATE "RefreshToken"
             SET "isRevoked" = true
           WHERE "userId" = ${record.adminId}
             AND "userType" = 'admin'
             AND "isRevoked" = false`;
      });
      this.logger.log(`Admin ${record.adminId} chose a password`);
      return true;
    } catch (error) {
      if (error instanceof BadRequestError) throw error;
      this.logger.error('Error setting an admin password:', error);
      throw new InternalServerError(t.errorSetPassword);
    }
  }
}
