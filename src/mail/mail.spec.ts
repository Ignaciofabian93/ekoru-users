import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
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
      await service.sendWelcomeEmail({
        email: 'test@example.com',
        name: 'John Doe',
        businessName: 'Business Name',
      });

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'Ekoru <contacto@ekoru.cl>',
          to: 'test@example.com',
          subject: '¡Bienvenido/a a Ekoru!',
          text: expect.stringContaining('John Doe'),
          html: expect.stringContaining('John Doe'),
        }),
      );
    });

    it('should send welcome email with business name when name is not provided', async () => {
      await service.sendWelcomeEmail({
        email: 'test@example.com',
        name: '',
        businessName: 'Acme Corporation',
      });

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'Ekoru <contacto@ekoru.cl>',
          to: 'test@example.com',
          subject: '¡Bienvenido/a a Ekoru!',
          text: expect.stringContaining('Acme Corporation'),
          html: expect.stringContaining('Acme Corporation'),
        }),
      );
    });

    it('should send welcome email with "usuario" when neither name nor business name are provided', async () => {
      await service.sendWelcomeEmail({
        email: 'test@example.com',
        name: '',
        businessName: '',
      });

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'Ekoru <contacto@ekoru.cl>',
          to: 'test@example.com',
          subject: '¡Bienvenido/a a Ekoru!',
          text: expect.stringContaining('usuario'),
          html: expect.stringContaining('usuario'),
        }),
      );
    });

    it('should handle null values gracefully', async () => {
      await service.sendWelcomeEmail({
        email: 'test@example.com',
        name: null as any,
        businessName: null as any,
      });

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'Ekoru <contacto@ekoru.cl>',
          to: 'test@example.com',
          subject: '¡Bienvenido/a a Ekoru!',
          text: expect.stringContaining('usuario'),
          html: expect.stringContaining('usuario'),
        }),
      );
    });

    it('should not throw error when sendMail fails', async () => {
      const loggerSpy = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation();
      mockTransporter.sendMail.mockRejectedValue(
        new Error('SMTP connection failed'),
      );

      await expect(
        service.sendWelcomeEmail({
          email: 'test@example.com',
          name: 'John Doe',
          businessName: '',
        }),
      ).resolves.not.toThrow();

      expect(loggerSpy).toHaveBeenCalledWith(
        'Error sending welcome email:',
        expect.any(Error),
      );

      loggerSpy.mockRestore();
    });

    it('should log error when email sending fails', async () => {
      const loggerSpy = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation();
      const error = new Error('Network error');
      mockTransporter.sendMail.mockRejectedValue(error);

      await service.sendWelcomeEmail({
        email: 'test@example.com',
        name: 'John Doe',
        businessName: '',
      });

      expect(loggerSpy).toHaveBeenCalledWith(
        'Error sending welcome email:',
        error,
      );

      loggerSpy.mockRestore();
    });
  });
});
