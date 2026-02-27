import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { welcomeTemplates } from './welcome-templates';
import type { SupportedLocale } from '../common/decorators/current-language.decorator';

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

  async sendWelcomeEmail(
    email: string,
    name: string,
    businessName: string,
    locale: SupportedLocale = 'es',
  ) {
    try {
      const displayName = name || businessName || 'usuario';
      const template = welcomeTemplates[locale] ?? welcomeTemplates['es'];
      const { subject, html, text } = template({ name: displayName });

      await this.transporter.sendMail({
        from: 'Ekoru <contacto@ekoru.cl>',
        to: email,
        subject,
        text,
        html,
      });
    } catch (error) {
      this.logger.error('Error sending welcome email:', error);
    }
  }
}
