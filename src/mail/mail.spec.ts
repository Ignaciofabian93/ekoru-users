import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';
import * as nodemailer from 'nodemailer';

jest.mock('nodemailer');

describe('MailService', () => {
  let service: MailService;
  let mockTransporter: any;

  beforeEach(async () => {
    mockTransporter = {
      sendMail: jest.fn().mockResolvedValue({ messageId: 'test-id' }),
    };

    (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);

    const mockConfigService = {
      get: jest.fn((key: string) => {
        const config: Record<string, any> = {
          'mail.host': 'smtp.test.com',
          'mail.port': 587,
          'mail.user': 'test@test.com',
          'mail.password': 'test-password',
        };
        return config[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<MailService>(MailService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create transporter with config values', () => {
      expect(nodemailer.createTransport).toHaveBeenCalledWith({
        host: 'smtp.test.com',
        port: 587,
        secure: false,
        auth: {
          user: 'test@test.com',
          pass: 'test-password',
        },
      });
    });

    it('should use default values when config is not available', async () => {
      jest.clearAllMocks();

      const mockConfigWithDefaults = {
        get: jest.fn().mockReturnValue(undefined),
      };

      await Test.createTestingModule({
        providers: [
          MailService,
          {
            provide: ConfigService,
            useValue: mockConfigWithDefaults,
          },
        ],
      }).compile();

      expect(nodemailer.createTransport).toHaveBeenCalledWith({
        host: 'smtp.zoho.com',
        port: 587,
        secure: false,
        auth: {
          user: '',
          pass: '',
        },
      });
    });
  });

  describe('sendWelcomeEmail', () => {
    it('should send welcome email with name', async () => {
      await service.sendWelcomeEmail(
        'test@example.com',
        'John Doe',
        'Business Name',
      );

      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: 'Ekoru <contacto@ekoru.cl>',
        to: 'test@example.com',
        subject: 'Bienvenido a Ekoru',
        text: 'Hola John Doe, ¡gracias por registrarte en Ekoru!',
        html: '<p>Hola John Doe, ¡gracias por registrarte en Ekoru!</p>',
      });
    });

    it('should send welcome email with business name when name is not provided', async () => {
      await service.sendWelcomeEmail(
        'test@example.com',
        '',
        'Acme Corporation',
      );

      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: 'Ekoru <contacto@ekoru.cl>',
        to: 'test@example.com',
        subject: 'Bienvenido a Ekoru',
        text: 'Hola Acme Corporation, ¡gracias por registrarte en Ekoru!',
        html: '<p>Hola Acme Corporation, ¡gracias por registrarte en Ekoru!</p>',
      });
    });

    it('should send welcome email with "usuario" when neither name nor business name are provided', async () => {
      await service.sendWelcomeEmail('test@example.com', '', '');

      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: 'Ekoru <contacto@ekoru.cl>',
        to: 'test@example.com',
        subject: 'Bienvenido a Ekoru',
        text: 'Hola usuario, ¡gracias por registrarte en Ekoru!',
        html: '<p>Hola usuario, ¡gracias por registrarte en Ekoru!</p>',
      });
    });

    it('should handle null values gracefully', async () => {
      await service.sendWelcomeEmail(
        'test@example.com',
        null as any,
        null as any,
      );

      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: 'Ekoru <contacto@ekoru.cl>',
        to: 'test@example.com',
        subject: 'Bienvenido a Ekoru',
        text: 'Hola usuario, ¡gracias por registrarte en Ekoru!',
        html: '<p>Hola usuario, ¡gracias por registrarte en Ekoru!</p>',
      });
    });

    it('should not throw error when sendMail fails', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockTransporter.sendMail.mockRejectedValue(
        new Error('SMTP connection failed'),
      );

      await expect(
        service.sendWelcomeEmail('test@example.com', 'John Doe', ''),
      ).resolves.not.toThrow();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error sending welcome email:',
        expect.any(Error),
      );

      consoleErrorSpy.mockRestore();
    });

    it('should log error when email sending fails', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const error = new Error('Network error');
      mockTransporter.sendMail.mockRejectedValue(error);

      await service.sendWelcomeEmail('test@example.com', 'John Doe', '');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error sending welcome email:',
        error,
      );

      consoleErrorSpy.mockRestore();
    });
  });
});
