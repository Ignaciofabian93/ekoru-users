import {
  businessApplicationReceivedTemplates,
  businessApplicationReviewMail,
  businessApprovedTemplates,
  businessRejectedTemplates,
  dealOfferTemplates,
  eventCancelledTemplates,
  eventRegistrationTemplates,
  loginAlertTemplates,
  noticeTemplates,
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
    [
      'business application received',
      businessApplicationReceivedTemplates,
      { businessName: 'Acme' },
    ],
    ['business approved', businessApprovedTemplates, { businessName: 'Acme' }],
    [
      'notice',
      noticeTemplates,
      {
        name: 'Nacho',
        title: 'Reserva confirmada',
        message: 'Tu reserva fue confirmada.',
      },
    ],
    [
      'business rejected',
      businessRejectedTemplates,
      { businessName: 'Acme', reason: 'Falta información' },
    ],
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

describe('business review', () => {
  it('escapes the rejection reason and keeps its line breaks', () => {
    const { html } = businessRejectedTemplates.es({
      businessName: 'Acme',
      reason: 'Línea 1\n<script>alert(1)</script>',
    });
    expect(html).toContain('Línea 1<br />');
    expect(html).not.toContain('<script>');
  });

  it('offers a rejected business the re-apply page in its language (USR-5)', () => {
    const es = businessRejectedTemplates.es({
      businessName: 'Acme',
      reason: 'Falta info',
    });
    const fr = businessRejectedTemplates.fr({
      businessName: 'Acme',
      reason: 'Manque',
    });
    expect(es.html).toContain('https://app.ekoru.cl/es/reapply');
    expect(es.text).toContain('https://app.ekoru.cl/es/reapply');
    expect(fr.html).toContain('https://app.ekoru.cl/fr/reapply');
  });

  it('marks a resubmission and shows the previous rejection reason to the reviewer', () => {
    const base = {
      sellerId: 'biz-1',
      businessName: 'Acme',
      email: 'biz@example.com',
      sellerType: 'COMPANY',
      businessType: 'RETAIL',
      message: 'Nuevo mensaje',
      submittedAt: new Date('2026-10-09T12:00:00Z'),
      reviewUrl: 'https://admin.ekoru.cl/es/users/biz-1',
    };
    const fresh = businessApplicationReviewMail(base);
    expect(fresh.subject).toContain('Nueva solicitud');
    expect(fresh.html).not.toContain('Motivo del rechazo anterior');

    const again = businessApplicationReviewMail({
      ...base,
      previousRejectionReason: 'Faltan <materiales>',
    });
    expect(again.subject).toContain('reenviada');
    expect(again.html).toContain('Motivo del rechazo anterior');
    expect(again.html).toContain('Faltan &lt;materiales&gt;');
    expect(again.text).toContain('Faltan <materiales>');
  });

  it('links the approved business to the login in its language', () => {
    expect(
      businessApprovedTemplates.en({ businessName: 'Acme' }).html,
    ).toContain('https://app.ekoru.cl/en/login');
  });

  it('gives the review inbox the application and a link to the panel', () => {
    const { subject, html, text } = businessApplicationReviewMail({
      sellerId: 'seller-1',
      businessName: 'Acme <Eco>',
      email: 'acme@example.com',
      sellerType: 'STARTUP',
      businessType: 'RETAIL',
      message: 'Vendemos envoltorios de cera de abeja.\nAlgodón orgánico.',
      submittedAt: new Date('2026-10-04T12:00:00Z'),
      reviewUrl: 'https://admin.ekoru.cl/es/users/seller-1',
    });
    expect(subject).toContain('Acme <Eco>');
    expect(html).toContain('Acme &lt;Eco&gt;');
    expect(html).toContain('cera de abeja.<br />');
    expect(html).toContain('https://admin.ekoru.cl/es/users/seller-1');
    expect(text).toContain('acme@example.com');
  });
});

describe('eventRegistrationTemplates', () => {
  const data = {
    name: 'Ana',
    eventTitle: 'Taller <de> reparación',
    startDate: new Date('2026-11-14T15:00:00Z'),
    place: 'Av. Irarrázaval 1000, Ñuñoa, Santiago',
    eventUrl: 'https://app.ekoru.cl/es/community',
  };

  it.each(['es', 'en', 'fr'] as const)(
    'renders %s with the event details',
    (lang) => {
      const { subject, html, text } = eventRegistrationTemplates[lang](data);
      expect(subject).toContain('Taller <de> reparación');
      expect(html).toContain('Taller &lt;de&gt; reparación');
      expect(html).not.toContain('<de>');
      expect(html).toContain('Ñuñoa');
      expect(html).toContain('https://app.ekoru.cl/es/community');
      expect(text).toContain('Ana');
    },
  );

  it('adds the join link only for online events', () => {
    const inPerson = eventRegistrationTemplates.es(data);
    expect(inPerson.html).not.toContain('meet.example.com');
    const online = eventRegistrationTemplates.es({
      ...data,
      place: null,
      onlineUrl: 'https://meet.example.com/x',
    });
    expect(online.html).toContain('href="https://meet.example.com/x"');
    expect(online.text).toContain('https://meet.example.com/x');
  });
});

describe('eventCancelledTemplates', () => {
  it.each(['es', 'en', 'fr'] as const)(
    'renders %s with the reason escaped',
    (lang) => {
      const { subject, html, text } = eventCancelledTemplates[lang]({
        name: 'Ana',
        eventTitle: 'Charla',
        startDate: new Date('2026-11-14T15:00:00Z'),
        reason: 'Lluvia <fuerte>',
        communityUrl: 'https://app.ekoru.cl/es/community',
      });
      expect(subject).toContain('Charla');
      expect(html).toContain('Lluvia &lt;fuerte&gt;');
      expect(html).toContain('https://app.ekoru.cl/es/community');
      expect(text).toContain('Ana');
    },
  );
});

describe('notice', () => {
  const base = {
    name: 'Nacho',
    title: 'Cotización aceptada',
    message: 'Ana aceptó tu cotización <b>Muebles</b>.',
  };

  it('uses the notification title as the subject and escapes the message', () => {
    const mail = noticeTemplates.es(base);
    expect(mail.subject).toBe('Cotización aceptada');
    expect(mail.html).toContain('&lt;b&gt;Muebles&lt;/b&gt;');
    expect(mail.html).not.toContain('<b>Muebles</b>');
  });

  it('resolves a relative action link against the web app', () => {
    const mail = noticeTemplates.en({
      ...base,
      actionUrl: '/profile/quotations',
    });
    expect(mail.html).toContain(
      'href="https://app.ekoru.cl/profile/quotations"',
    );
    expect(mail.text).toContain('https://app.ekoru.cl/profile/quotations');
  });

  it('drops a javascript: action link', () => {
    const mail = noticeTemplates.fr({
      ...base,
      actionUrl: 'javascript:alert(1)',
    });
    expect(mail.html).not.toContain('javascript:');
    expect(mail.html).not.toContain('class="cta"');
  });
});
