import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import {
  dealOfferTemplates,
  loginAlertTemplates,
  pickTemplate,
  transactionTemplates,
  welcomeTemplates,
  type DealOfferData,
  type LoginAlertData,
  type RenderedMail,
  type TransactionData,
} from './templates';

const FROM = 'Ekoru <contacto@ekoru.cl>';

/**
 * Renders and delivers transactional email.
 *
 * This layer has no opinion about *whether* an email should go out — that gate
 * lives in `NotificationsService`, which owns the `SellerPreferences` lookup.
 * Callers that reach MailService directly (the welcome email) are sending mail
 * that is not subject to a preference.
 *
 * Delivery failures are logged, never thrown: no registration, login or deal
 * should fail because SMTP was briefly unavailable.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('mail.host') || 'smtp.zoho.com',
      port: this.configService.get<number>('mail.port') || 587,
      secure: false,
      auth: {
        user: this.configService.get<string>('mail.user') || '',
        pass: this.configService.get<string>('mail.password') || '',
      },
    });
  }

  async sendWelcomeEmail({
    email,
    name,
    businessName,
    locale = 'es',
  }: {
    email: string;
    name: string;
    businessName: string;
    locale?: string;
  }) {
    const displayName = name || businessName || 'usuario';
    const template = pickTemplate(welcomeTemplates, locale);
    await this.send('welcome', email, template({ name: displayName }));
  }

  /**
   * Security notice sent after a successful sign-in. Gated on
   * `SellerPreferences.enableLoginAlerts` by the caller.
   */
  async sendLoginAlertEmail({
    email,
    locale,
    data,
  }: {
    email: string;
    locale?: string;
    data: LoginAlertData;
  }) {
    const template = pickTemplate(loginAlertTemplates, locale);
    await this.send('login alert', email, template(data));
  }

  /**
   * Order / P2P deal lifecycle update. Gated on
   * `SellerPreferences.enableEmailNotifications` by the caller.
   */
  async sendTransactionEmail({
    email,
    locale,
    data,
  }: {
    email: string;
    locale?: string;
    data: TransactionData;
  }) {
    const template = pickTemplate(transactionTemplates, locale);
    await this.send('transaction', email, template(data));
  }

  /**
   * Tells a product owner that another seller proposed a sale or exchange.
   * Gated on `SellerPreferences.enableEmailNotifications` by the caller.
   */
  async sendDealOfferEmail({
    email,
    locale,
    data,
  }: {
    email: string;
    locale?: string;
    data: DealOfferData;
  }) {
    const template = pickTemplate(dealOfferTemplates, locale);
    await this.send('deal offer', email, template(data));
  }

  private async send(kind: string, to: string, mail: RenderedMail) {
    try {
      await this.transporter.sendMail({
        from: FROM,
        to,
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
      });
    } catch (error) {
      this.logger.error(`Error sending ${kind} email:`, error);
    }
  }
}
