import {
  dealOfferTemplates,
  loginAlertTemplates,
  pickTemplate,
  transactionTemplates,
  welcomeTemplates,
  type DealOfferData,
  type LoginAlertData,
  type TransactionData,
} from './index';

const loginData: LoginAlertData = {
  name: 'Nacho',
  browser: 'Chrome 138',
  operatingSystem: 'Windows 10/11',
  deviceKind: 'DESKTOP',
  ipAddress: '190.1.2.3',
  occurredAt: new Date('2026-08-09T14:30:00Z'),
};

const transactionData: TransactionData = {
  name: 'Nacho',
  stage: 'COMPLETED',
  role: 'BUYER',
  reference: '#1042',
  summary: 'Chaqueta de mezclilla',
  amount: 24990,
  currency: 'CLP',
};

const dealData: DealOfferData = {
  name: 'Nacho',
  offererName: 'Camila',
  dealKind: 'EXCHANGE',
  requestedProductTitle: 'Bicicleta urbana',
  offeredProductTitle: 'Cámara analógica',
  compensationAmount: 15000,
  currency: 'CLP',
};

describe('pickTemplate', () => {
  it('accepts both the Prisma casing and the lowercase form', () => {
    expect(pickTemplate(welcomeTemplates, 'EN')).toBe(welcomeTemplates.en);
    expect(pickTemplate(welcomeTemplates, 'en')).toBe(welcomeTemplates.en);
  });

  it('falls back to Spanish for an unshipped or missing locale', () => {
    expect(pickTemplate(welcomeTemplates, 'pt')).toBe(welcomeTemplates.es);
    expect(pickTemplate(welcomeTemplates, null)).toBe(welcomeTemplates.es);
  });
});

describe('every template', () => {
  const cases = [
    ['welcome', welcomeTemplates, { name: 'Nacho' }],
    ['login alert', loginAlertTemplates, loginData],
    ['transaction', transactionTemplates, transactionData],
    ['deal offer', dealOfferTemplates, dealData],
  ] as const;

  it.each(cases)('renders %s in all three locales', (_label, map, data) => {
    for (const locale of ['es', 'en', 'fr'] as const) {
      // @ts-expect-error — the tuple union widens `data` across template shapes
      const rendered = map[locale](data);
      expect(rendered.subject).toBeTruthy();
      expect(rendered.text).toBeTruthy();
      expect(rendered.html).toContain('<!DOCTYPE html>');
      expect(rendered.html).toContain(`<html lang="${locale}">`);
    }
  });
});

describe('login alert', () => {
  it('shows the device specs and a way to react', () => {
    const { html, text } = loginAlertTemplates.es(loginData);
    expect(html).toContain('Chrome 138');
    expect(html).toContain('Windows 10/11');
    expect(html).toContain('190.1.2.3');
    expect(html).toContain('https://app.ekoru.cl/profile/settings');
    expect(text).toContain('190.1.2.3');
  });

  it('omits rows it has no value for', () => {
    const { html } = loginAlertTemplates.es({
      ...loginData,
      ipAddress: null,
      location: null,
      userAgent: null,
    });
    expect(html).not.toContain('Ubicación aproximada');
    expect(html).not.toContain('Dirección IP');
  });
});

describe('transaction', () => {
  it('addresses the buyer and the seller differently for the same stage', () => {
    const buyer = transactionTemplates.es(transactionData);
    const seller = transactionTemplates.es({
      ...transactionData,
      role: 'SELLER',
    });
    expect(buyer.html).not.toEqual(seller.html);
    expect(seller.html).toContain('eco-puntos');
  });

  it('formats CLP without decimals', () => {
    const { html } = transactionTemplates.es(transactionData);
    expect(html).toContain('24.990');
    expect(html).not.toContain('24.990,00');
  });

  it('renders each stage with its own subject', () => {
    const subjects = (
      ['STARTED', 'IN_PROCESS', 'COMPLETED', 'CANCELLED', 'REFUNDED'] as const
    ).map(
      (stage) => transactionTemplates.es({ ...transactionData, stage }).subject,
    );
    expect(new Set(subjects).size).toBe(5);
  });
});

describe('deal offer', () => {
  it('shows both items and the top-up for an exchange', () => {
    const { html } = dealOfferTemplates.es(dealData);
    expect(html).toContain('Bicicleta urbana');
    expect(html).toContain('Cámara analógica');
    expect(html).toContain('15.000');
  });

  it('shows only the requested item for a sale', () => {
    const { html } = dealOfferTemplates.es({
      ...dealData,
      dealKind: 'SALE',
      offeredProductTitle: null,
      compensationAmount: null,
    });
    expect(html).toContain('Bicicleta urbana');
    expect(html).not.toContain('Cámara analógica');
  });

  it('labels the top-up by who pays it', () => {
    const paying = dealOfferTemplates.es({
      ...dealData,
      compensationPaidByRecipient: true,
    });
    const receiving = dealOfferTemplates.es({
      ...dealData,
      compensationPaidByRecipient: false,
    });
    expect(paying.html).toContain('Compensación que pagas tú');
    expect(receiving.html).toContain('Compensación que recibes');
  });
});

describe('untrusted values', () => {
  it('escapes markup in a product title', () => {
    const { html } = dealOfferTemplates.es({
      ...dealData,
      requestedProductTitle: '<script>alert(1)</script>',
    });
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('escapes markup in a display name', () => {
    const { html } = dealOfferTemplates.es({
      ...dealData,
      offererName: '<img src=x onerror=alert(1)>',
    });
    expect(html).not.toContain('<img src=x');
  });

  it('drops a javascript: link rather than rendering it', () => {
    const { html } = transactionTemplates.es({
      ...transactionData,
      detailUrl: 'javascript:alert(1)',
    });
    expect(html).not.toContain('javascript:');
    expect(html).toContain('https://app.ekoru.cl/profile/orders');
  });

  it('drops a javascript: image source', () => {
    const { html } = dealOfferTemplates.es({
      ...dealData,
      requestedProductImage: 'javascript:alert(1)',
    });
    expect(html).not.toContain('javascript:');
    expect(html).not.toContain('<img');
  });

  it('keeps a legitimate https link', () => {
    const { html } = transactionTemplates.es({
      ...transactionData,
      detailUrl: 'https://app.ekoru.cl/profile/orders',
    });
    expect(html).toContain('https://app.ekoru.cl/profile/orders');
  });
});
