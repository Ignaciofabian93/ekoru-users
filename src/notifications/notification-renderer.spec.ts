import { Test, TestingModule } from '@nestjs/testing';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationRenderer, interpolate } from './notification-renderer';

describe('interpolate', () => {
  it('fills placeholders from the payload', () => {
    expect(
      interpolate('{{actorName}} quiere comprar {{title}}.', {
        actorName: 'Camila',
        title: 'Bicicleta',
      }),
    ).toBe('Camila quiere comprar Bicicleta.');
  });

  it('tolerates whitespace inside the braces', () => {
    expect(interpolate('Hola {{ name }}', { name: 'Nacho' })).toBe(
      'Hola Nacho',
    );
  });

  it('collapses unknown placeholders instead of leaking them', () => {
    // A template referencing a field this event doesn't carry must not show
    // "{{note}}" to a user.
    expect(interpolate('Orden lista. {{note}}', {})).toBe('Orden lista.');
    expect(interpolate('Orden lista. {{note}}', { note: null })).toBe(
      'Orden lista.',
    );
  });

  it('stringifies numbers and booleans', () => {
    expect(interpolate('Total: {{amount}}', { amount: 24990 })).toBe(
      'Total: 24990',
    );
    expect(interpolate('Pagado: {{paid}}', { paid: true })).toBe(
      'Pagado: true',
    );
  });

  it('drops objects rather than rendering [object Object]', () => {
    // Payloads are loose JSON, so a placeholder can land on a nested object.
    expect(interpolate('Detalle: {{item}}', { item: { id: 1 } })).toBe(
      'Detalle:',
    );
    expect(interpolate('Detalle: {{items}}', { items: [1, 2] })).toBe(
      'Detalle:',
    );
  });
});

describe('NotificationRenderer', () => {
  let renderer: NotificationRenderer;
  let findUnique: jest.Mock;

  const template = (overrides: Record<string, unknown> = {}) => ({
    title: 'Plantilla admin',
    message: 'Hola {{actorName}}',
    isActive: true,
    translations: [],
    ...overrides,
  });

  beforeEach(async () => {
    findUnique = jest.fn().mockResolvedValue(null);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationRenderer,
        {
          provide: PrismaService,
          useValue: { notificationTemplate: { findUnique } },
        },
      ],
    }).compile();

    renderer = module.get(NotificationRenderer);
    renderer.invalidate();
  });

  afterEach(() => jest.clearAllMocks());

  it('falls back to registry copy when no admin template exists', async () => {
    const result = await renderer.render(NotificationType.SALE_PROPOSAL, 'es', {
      actorName: 'Camila',
      requestedProductTitle: 'Bicicleta',
    });

    expect(result).toEqual({
      title: 'Nueva propuesta de compra',
      message: 'Camila quiere comprar Bicicleta.',
    });
  });

  it('prefers the admin template over the code fallback', async () => {
    findUnique.mockResolvedValue(template());

    const result = await renderer.render(NotificationType.SALE_PROPOSAL, 'es', {
      actorName: 'Camila',
    });

    expect(result).toEqual({
      title: 'Plantilla admin',
      message: 'Hola Camila',
    });
  });

  it('prefers the translation matching the seller language', async () => {
    findUnique.mockResolvedValue(
      template({
        translations: [
          {
            language: 'EN',
            title: 'Admin template',
            message: 'Hi {{actorName}}',
          },
        ],
      }),
    );

    const result = await renderer.render(NotificationType.SALE_PROPOSAL, 'en', {
      actorName: 'Camila',
    });

    expect(result).toEqual({ title: 'Admin template', message: 'Hi Camila' });
  });

  it('uses the base template when no translation matches', async () => {
    findUnique.mockResolvedValue(
      template({
        translations: [{ language: 'FR', title: 'Modèle', message: 'Bonjour' }],
      }),
    );

    const result = await renderer.render(NotificationType.SALE_PROPOSAL, 'en', {
      actorName: 'Camila',
    });

    expect(result.title).toBe('Plantilla admin');
  });

  it('ignores a deactivated template rather than dropping the notification', async () => {
    findUnique.mockResolvedValue(template({ isActive: false }));

    const result = await renderer.render(NotificationType.SALE_PROPOSAL, 'es', {
      actorName: 'Camila',
      requestedProductTitle: 'Bicicleta',
    });

    expect(result.title).toBe('Nueva propuesta de compra');
  });

  it('never reads an admin template for a security notice', async () => {
    findUnique.mockResolvedValue(
      template({ title: 'PWNED', message: 'Click here' }),
    );

    const result = await renderer.render(
      NotificationType.SECURITY_LOGIN_ALERT,
      'es',
      { browser: 'Chrome 138', operatingSystem: 'Windows 10/11' },
    );

    expect(findUnique).not.toHaveBeenCalled();
    expect(result).toEqual({
      title: 'Nuevo inicio de sesión',
      message: 'Se inició sesión desde Chrome 138 · Windows 10/11.',
    });
  });

  it('falls back to generic copy for a type with no registry entry', async () => {
    const result = await renderer.render(
      NotificationType.PRODUCT_LIKED,
      'en',
      {},
    );

    expect(result).toEqual({
      title: 'Ekoru update',
      message: 'You have an update.',
    });
  });

  it('still renders when the template lookup throws', async () => {
    findUnique.mockRejectedValue(new Error('db down'));

    const result = await renderer.render(NotificationType.SALE_PROPOSAL, 'es', {
      actorName: 'Camila',
      requestedProductTitle: 'Bicicleta',
    });

    expect(result.title).toBe('Nueva propuesta de compra');
  });

  it('caches templates across renders and drops them on invalidate', async () => {
    findUnique.mockResolvedValue(template());

    await renderer.render(NotificationType.SALE_PROPOSAL, 'es', {});
    await renderer.render(NotificationType.SALE_PROPOSAL, 'es', {});
    expect(findUnique).toHaveBeenCalledTimes(1);

    renderer.invalidate();
    await renderer.render(NotificationType.SALE_PROPOSAL, 'es', {});
    expect(findUnique).toHaveBeenCalledTimes(2);
  });
});
