import {
  APP_BASE_URL,
  SUPPORT_EMAIL,
  buildHtml,
  escapeHtml,
  footer,
  formatAmount,
  header,
  safeUrl,
  specTable,
  type MailLocale,
  type TemplateMap,
} from './layout';

/** Mirrors `P2PDealType` in the transactions subgraph. */
export type DealKind = 'SALE' | 'EXCHANGE';

export interface DealOfferData {
  /** Recipient — the owner of the requested product. */
  name: string;
  /** The seller who made the offer. */
  offererName: string;
  dealKind: DealKind;
  /** The recipient's product the other user wants. */
  requestedProductTitle: string;
  requestedProductImage?: string | null;
  requestedProductPrice?: number | null;
  /** EXCHANGE only: what the offerer is putting up in return. */
  offeredProductTitle?: string | null;
  offeredProductImage?: string | null;
  offeredProductPrice?: number | null;
  /** EXCHANGE only: cash top-up closing a price gap. */
  compensationAmount?: number | null;
  /** True when the recipient is the one who pays the top-up. */
  compensationPaidByRecipient?: boolean;
  currency?: string | null;
  /** Deep link to the deal so the owner can accept or decline. */
  dealUrl?: string | null;
}

interface Copy {
  tagline: string;
  subjectSale: (offerer: string) => string;
  subjectExchange: (offerer: string) => string;
  greeting: (name: string) => string;
  leadSale: (offerer: string, product: string) => string;
  leadExchange: (offerer: string, product: string) => string;
  labelRequested: string;
  labelOffered: string;
  labelFrom: string;
  labelCompensationYouPay: string;
  labelCompensationTheyPay: string;
  reminder: string;
  cta: string;
  help: (email: string) => string;
  footer: string;
}

const COPY: Record<MailLocale, Copy> = {
  es: {
    tagline: 'Nueva propuesta de trato',
    subjectSale: (o) => `${o} quiere comprar tu producto`,
    subjectExchange: (o) => `${o} te propone un intercambio`,
    greeting: (name) => `Hola, ${name}`,
    leadSale: (o, p) =>
      `<strong>${o}</strong> está interesado/a en comprar tu producto <strong>${p}</strong>. Revisa la propuesta y decide si la aceptas.`,
    leadExchange: (o, p) =>
      `<strong>${o}</strong> te propone intercambiar por tu producto <strong>${p}</strong>. Mira lo que ofrece a cambio.`,
    labelRequested: 'Tu producto',
    labelOffered: 'Lo que te ofrecen',
    labelFrom: 'Propuesta de',
    labelCompensationYouPay: 'Compensación que pagas tú',
    labelCompensationTheyPay: 'Compensación que recibes',
    reminder:
      'Recuerda: los tratos se coordinan y se pagan en persona. Nunca transfieras dinero por adelantado y confirma la entrega desde la plataforma.',
    cta: 'Ver la propuesta',
    help: (email) =>
      `¿Algo no cuadra? Repórtalo a <a href="mailto:${email}">${email}</a>.`,
    footer:
      'Recibiste este correo porque tienes activadas las notificaciones por email.',
  },

  en: {
    tagline: 'New deal proposal',
    subjectSale: (o) => `${o} wants to buy your product`,
    subjectExchange: (o) => `${o} is proposing an exchange`,
    greeting: (name) => `Hi, ${name}`,
    leadSale: (o, p) =>
      `<strong>${o}</strong> is interested in buying your product <strong>${p}</strong>. Review the proposal and decide whether to accept.`,
    leadExchange: (o, p) =>
      `<strong>${o}</strong> wants to trade for your product <strong>${p}</strong>. Take a look at what they're offering in return.`,
    labelRequested: 'Your product',
    labelOffered: "What you're offered",
    labelFrom: 'Proposal from',
    labelCompensationYouPay: 'Top-up you pay',
    labelCompensationTheyPay: 'Top-up you receive',
    reminder:
      'Remember: deals are arranged and paid in person. Never transfer money in advance, and confirm the handover through the platform.',
    cta: 'View the proposal',
    help: (email) =>
      `Something off? Report it to <a href="mailto:${email}">${email}</a>.`,
    footer: 'You received this email because email notifications are enabled.',
  },

  fr: {
    tagline: 'Nouvelle proposition',
    subjectSale: (o) => `${o} souhaite acheter votre produit`,
    subjectExchange: (o) => `${o} vous propose un échange`,
    greeting: (name) => `Bonjour, ${name}`,
    leadSale: (o, p) =>
      `<strong>${o}</strong> souhaite acheter votre produit <strong>${p}</strong>. Consultez la proposition et décidez si vous l'acceptez.`,
    leadExchange: (o, p) =>
      `<strong>${o}</strong> vous propose un échange contre votre produit <strong>${p}</strong>. Découvrez ce qui vous est offert en retour.`,
    labelRequested: 'Votre produit',
    labelOffered: 'Ce qui vous est proposé',
    labelFrom: 'Proposition de',
    labelCompensationYouPay: 'Complément que vous payez',
    labelCompensationTheyPay: 'Complément que vous recevez',
    reminder:
      "Rappel : les échanges se font et se paient en personne. Ne transférez jamais d'argent à l'avance et confirmez la remise depuis la plateforme.",
    cta: 'Voir la proposition',
    help: (email) =>
      `Quelque chose ne va pas ? Signalez-le à <a href="mailto:${email}">${email}</a>.`,
    footer:
      'Vous recevez cet e-mail car les notifications par e-mail sont activées.',
  },
};

function productCard(
  label: string,
  title: string,
  price: string | null,
  image: string | null,
): string {
  return `
        <div class="card">
          ${image ? `<img src="${image}" alt="${escapeHtml(title)}" />` : ''}
          <p class="label">${escapeHtml(label)}</p>
          <p class="title">${escapeHtml(title)}</p>
          ${price ? `<p class="price">${escapeHtml(price)}</p>` : ''}
        </div>`;
}

function render(locale: MailLocale, data: DealOfferData) {
  const t = COPY[locale];
  const isExchange = data.dealKind === 'EXCHANGE';

  const requestedPrice = formatAmount(
    data.requestedProductPrice,
    data.currency,
    locale,
  );
  const offeredPrice = formatAmount(
    data.offeredProductPrice,
    data.currency,
    locale,
  );
  const compensation = formatAmount(
    data.compensationAmount,
    data.currency,
    locale,
  );
  const url = safeUrl(data.dealUrl) ?? `${APP_BASE_URL}/deals`;

  const subject = isExchange
    ? t.subjectExchange(data.offererName)
    : t.subjectSale(data.offererName);

  // The offerer name and product titles are escaped before going into the
  // lead, which intentionally contains <strong> markup.
  const lead = isExchange
    ? t.leadExchange(
        escapeHtml(data.offererName),
        escapeHtml(data.requestedProductTitle),
      )
    : t.leadSale(
        escapeHtml(data.offererName),
        escapeHtml(data.requestedProductTitle),
      );

  const cards = [
    productCard(
      t.labelRequested,
      data.requestedProductTitle,
      requestedPrice,
      safeUrl(data.requestedProductImage),
    ),
    isExchange && data.offeredProductTitle
      ? `<div class="swap">⇅</div>${productCard(
          t.labelOffered,
          data.offeredProductTitle,
          offeredPrice,
          safeUrl(data.offeredProductImage),
        )}`
      : '',
  ].join('');

  const compensationLabel = data.compensationPaidByRecipient
    ? t.labelCompensationYouPay
    : t.labelCompensationTheyPay;

  const textParts = [
    `${t.greeting(data.name)}.`,
    subject,
    `${t.labelRequested}: ${data.requestedProductTitle}`,
    isExchange && data.offeredProductTitle
      ? `${t.labelOffered}: ${data.offeredProductTitle}`
      : null,
    compensation ? `${compensationLabel}: ${compensation}` : null,
    `${t.cta}: ${url}`,
  ].filter(Boolean);

  return {
    subject,
    text: textParts.join(' — '),
    html: buildHtml(
      `
      ${header(t.tagline)}
      <div class="body">
        <h2>${escapeHtml(t.greeting(data.name))}</h2>
        <p>${lead}</p>
        ${cards}
        ${specTable([
          [t.labelFrom, data.offererName],
          [compensationLabel, compensation],
        ])}
        <div class="notice">
          <p>${escapeHtml(t.reminder)}</p>
        </div>
        <div class="cta">
          <a href="${url}">${escapeHtml(t.cta)}</a>
        </div>
        <div class="divider"></div>
        <p>${t.help(SUPPORT_EMAIL)}</p>
      </div>
      ${footer(t.footer)}
    `,
      locale,
    ),
  };
}

export const dealOfferTemplates: TemplateMap<DealOfferData> = {
  es: (data) => render('es', data),
  en: (data) => render('en', data),
  fr: (data) => render('fr', data),
};
