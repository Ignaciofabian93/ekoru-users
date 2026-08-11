import { ValidationPipe } from '@nestjs/common';
import { NotificationType, DevicePlatform } from '../../graphql/enums';
import { EmitNotificationInput, RegisterDeviceInput } from './index';

/**
 * Mirrors the global pipe in `main.ts` exactly. `forbidNonWhitelisted` is the
 * dangerous one: it rejects any supplied property that carries no
 * class-validator decorator, and reports it as a bare "Bad Request Exception"
 * with no clue which field was at fault.
 *
 * That is a runtime-only failure — the DTO compiles, the resolver is correct,
 * and every unit test passes, because nothing else instantiates the pipe. It
 * cost a production debugging session, so these tests exercise the real thing
 * with the payloads the calling services actually send.
 */
const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: { enableImplicitConversion: true },
});

const through = <T>(metatype: new () => T, value: unknown) =>
  pipe.transform(value, { type: 'body', metatype });

describe('EmitNotificationInput', () => {
  it('accepts the full payload ekoru-transactions sends for a deal offer', async () => {
    await expect(
      through(EmitNotificationInput, {
        sellerId: '6e73c247-d2cc-43fe-8cd3-3773a72ce832',
        type: NotificationType.SALE_PROPOSAL,
        relatedId: '57',
        actionUrl: 'https://app.ekoru.cl/deals',
        data: {
          dealKind: 'SALE',
          actorSellerId: '7a5fdeb9-f5d0-46cc-a22f-efb3e42eb924',
          requestedProductTitle: 'Bicicleta urbana',
          requestedProductImage: null,
          requestedProductPrice: 45000,
        },
      }),
    ).resolves.toBeDefined();
  });

  it('accepts the payload sent for a transaction update', async () => {
    await expect(
      through(EmitNotificationInput, {
        sellerId: 'seller-1',
        type: NotificationType.ORDER_RECEIVED,
        relatedId: '1042',
        actionUrl: 'https://app.ekoru.cl/profile/orders',
        data: {
          stage: 'STARTED',
          role: 'BUYER',
          reference: '#1042',
          summary: '2 productos',
          amount: 24990,
          currency: 'CLP',
          note: null,
        },
      }),
    ).resolves.toBeDefined();
  });

  it('accepts the payload the gateway sends for a login alert', async () => {
    await expect(
      through(EmitNotificationInput, {
        sellerId: 'seller-1',
        type: NotificationType.SECURITY_LOGIN_ALERT,
        actionUrl: '/profile/settings',
        data: {
          userAgent: 'Mozilla/5.0 (Windows NT 10.0) Chrome/138.0.0.0',
          ipAddress: '190.1.2.3',
          occurredAt: '2026-08-11T05:14:28.000Z',
        },
      }),
    ).resolves.toBeDefined();
  });

  it('accepts a minimal payload with only the required fields', async () => {
    await expect(
      through(EmitNotificationInput, {
        sellerId: 'seller-1',
        type: NotificationType.EXCHANGE_DECLINED,
      }),
    ).resolves.toBeDefined();
  });

  it('rejects an unknown notification type', async () => {
    await expect(
      through(EmitNotificationInput, {
        sellerId: 'seller-1',
        type: 'NOT_A_REAL_TYPE',
      }),
    ).rejects.toThrow();
  });

  it('rejects a missing sellerId', async () => {
    await expect(
      through(EmitNotificationInput, {
        sellerId: '',
        type: NotificationType.SALE_PROPOSAL,
      }),
    ).rejects.toThrow();
  });

  it('rejects a property the DTO does not declare', async () => {
    // Proves forbidNonWhitelisted is genuinely active in this test, so the
    // passing cases above mean something.
    await expect(
      through(EmitNotificationInput, {
        sellerId: 'seller-1',
        type: NotificationType.SALE_PROPOSAL,
        somethingElse: 'nope',
      }),
    ).rejects.toThrow();
  });
});

describe('RegisterDeviceInput', () => {
  it('accepts what the mobile app sends', async () => {
    await expect(
      through(RegisterDeviceInput, {
        pushToken: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
        platform: DevicePlatform.ANDROID,
        deviceName: 'Pixel 8',
      }),
    ).resolves.toBeDefined();
  });

  it('accepts a registration with no device name', async () => {
    await expect(
      through(RegisterDeviceInput, {
        pushToken: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
        platform: DevicePlatform.IOS,
      }),
    ).resolves.toBeDefined();
  });

  it('rejects an unknown platform', async () => {
    await expect(
      through(RegisterDeviceInput, {
        pushToken: 'token',
        platform: 'WINDOWS_PHONE',
      }),
    ).rejects.toThrow();
  });
});
