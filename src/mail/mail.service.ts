import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
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

  async sendWelcomeEmail(email: string, name: string, businessName: string) {
    try {
      await this.transporter.sendMail({
        from: 'Ekoru <contacto@ekoru.cl>',
        to: email,
        subject: 'Bienvenido a Ekoru',
        text: `Hola ${name || businessName || 'usuario'}, ¡gracias por registrarte en Ekoru!`,
        html: `<p>Hola ${name || businessName || 'usuario'}, ¡gracias por registrarte en Ekoru!</p>`,
      });
    } catch (error) {
      console.error('Error sending welcome email:', error);
    }
  }
}
