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

/**
 * Where the transaction is in its life. Deliberately coarser than
 * `OrderStatus` / `P2PStatus` / `PaymentStatus` — the buyer does not need an
 * email per internal state change, and the calling service decides which of
 * its own transitions maps onto which stage.
 */
export type TransactionStage =
  | 'STARTED'
  | 'IN_PROCESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REFUNDED';

/** Which side of the transaction the recipient is on. */
export type TransactionRole = 'BUYER' | 'SELLER';

export interface TransactionData {
  name: string;
  stage: TransactionStage;
  role: TransactionRole;
  /** Human reference shown to the user, e.g. "#1042" or "Trato #57". */
  reference: string;
  /** One-line description of what was bought/sold. */
  summary: string;
  amount?: number | null;
  currency?: string | null;
  /** The other party's display name. */
  counterpartName?: string | null;
  /** Extra context: shipping stage, cancellation reason, refund note. */
  note?: string | null;
  /** Deep link to the order/deal detail page. */
  detailUrl?: string | null;
}

type BadgeTone = 'neutral' | 'progress' | 'success' | 'danger';

const TONES: Record<TransactionStage, BadgeTone> = {
  STARTED: 'neutral',
  IN_PROCESS: 'progress',
  COMPLETED: 'success',
  CANCELLED: 'danger',
  REFUNDED: 'danger',
};

interface StageCopy {
  badge: string;
  subject: (reference: string) => string;
  heading: string;
  /** Lead paragraph, one per side of the transaction. */
  buyer: string;
  seller: string;
}

interface Copy {
  tagline: string;
  greeting: (name: string) => string;
  labels: {
    reference: string;
    detail: string;
    amount: string;
    counterpartForBuyer: string;
    counterpartForSeller: string;
    note: string;
  };
  cta: string;
  help: (email: string) => string;
  footer: string;
  stages: Record<TransactionStage, StageCopy>;
}

const COPY: Record<MailLocale, Copy> = {
  es: {
    tagline: 'Estado de tu transacción',
    greeting: (name) => `Hola, ${name}`,
    labels: {
      reference: 'Referencia',
      detail: 'Detalle',
      amount: 'Monto',
      counterpartForBuyer: 'Vendedor',
      counterpartForSeller: 'Comprador',
      note: 'Nota',
    },
    cta: 'Ver el detalle',
    help: (email) =>
      `¿Tienes dudas sobre esta transacción? Escríbenos a <a href="mailto:${email}">${email}</a>.`,
    footer:
      'Recibiste este correo porque tienes activadas las notificaciones por email.',
    stages: {
      STARTED: {
        badge: 'Iniciada',
        subject: (r) => `Tu transacción ${r} ha comenzado`,
        heading: 'Tu transacción ha comenzado',
        buyer:
          'Registramos tu transacción y ya está en marcha. Te avisaremos en cuanto avance al siguiente paso.',
        seller:
          'Se ha iniciado una transacción por uno de tus productos. Prepara el envío o coordina la entrega con el comprador.',
      },
      IN_PROCESS: {
        badge: 'En proceso',
        subject: (r) => `Tu transacción ${r} está en proceso`,
        heading: 'Tu transacción está en proceso',
        buyer:
          'Tu transacción avanza según lo previsto. Te escribiremos de nuevo cuando esté completada.',
        seller:
          'La transacción avanza. Mantén al comprador informado si hay cambios en la entrega.',
      },
      COMPLETED: {
        badge: 'Completada',
        subject: (r) => `¡Tu transacción ${r} se completó!`,
        heading: '¡Transacción completada!',
        buyer:
          '¡Todo listo! Tu transacción se completó con éxito. Gracias por elegir un consumo más consciente.',
        seller:
          '¡Felicitaciones! La transacción se completó con éxito y tus eco-puntos ya fueron acreditados.',
      },
      CANCELLED: {
        badge: 'Cancelada',
        subject: (r) => `Tu transacción ${r} fue cancelada`,
        heading: 'Transacción cancelada',
        buyer:
          'Esta transacción fue cancelada. Si realizaste un pago, se revertirá según la política del medio de pago.',
        seller:
          'Esta transacción fue cancelada. Tus productos vuelven a estar disponibles en la plataforma.',
      },
      REFUNDED: {
        badge: 'Reembolsada',
        subject: (r) => `Tu transacción ${r} fue reembolsada`,
        heading: 'Transacción reembolsada',
        buyer:
          'Procesamos el reembolso de esta transacción. Según tu banco, el abono puede tardar algunos días hábiles.',
        seller:
          'Se procesó un reembolso para esta transacción. El monto será descontado de tu liquidación.',
      },
    },
  },

  en: {
    tagline: 'Your transaction status',
    greeting: (name) => `Hi, ${name}`,
    labels: {
      reference: 'Reference',
      detail: 'Details',
      amount: 'Amount',
      counterpartForBuyer: 'Seller',
      counterpartForSeller: 'Buyer',
      note: 'Note',
    },
    cta: 'View details',
    help: (email) =>
      `Questions about this transaction? Write to us at <a href="mailto:${email}">${email}</a>.`,
    footer: 'You received this email because email notifications are enabled.',
    stages: {
      STARTED: {
        badge: 'Started',
        subject: (r) => `Your transaction ${r} has started`,
        heading: 'Your transaction has started',
        buyer:
          "We've recorded your transaction and it's now underway. We'll let you know as soon as it moves forward.",
        seller:
          'A transaction has started for one of your products. Get the shipment ready or arrange handover with the buyer.',
      },
      IN_PROCESS: {
        badge: 'In process',
        subject: (r) => `Your transaction ${r} is in process`,
        heading: 'Your transaction is in process',
        buyer:
          "Your transaction is moving along as expected. We'll write again once it's complete.",
        seller:
          'The transaction is progressing. Keep the buyer posted if anything about delivery changes.',
      },
      COMPLETED: {
        badge: 'Completed',
        subject: (r) => `Your transaction ${r} is complete!`,
        heading: 'Transaction complete!',
        buyer:
          'All done! Your transaction completed successfully. Thank you for choosing more conscious consumption.',
        seller:
          'Congratulations! The transaction completed successfully and your eco-points have been credited.',
      },
      CANCELLED: {
        badge: 'Cancelled',
        subject: (r) => `Your transaction ${r} was cancelled`,
        heading: 'Transaction cancelled',
        buyer:
          "This transaction was cancelled. If you already paid, the charge will be reversed per your payment method's policy.",
        seller:
          'This transaction was cancelled. Your products are available on the platform again.',
      },
      REFUNDED: {
        badge: 'Refunded',
        subject: (r) => `Your transaction ${r} was refunded`,
        heading: 'Transaction refunded',
        buyer:
          'We processed the refund for this transaction. Depending on your bank, it may take a few business days to appear.',
        seller:
          'A refund was processed for this transaction. The amount will be deducted from your payout.',
      },
    },
  },

  fr: {
    tagline: 'État de votre transaction',
    greeting: (name) => `Bonjour, ${name}`,
    labels: {
      reference: 'Référence',
      detail: 'Détail',
      amount: 'Montant',
      counterpartForBuyer: 'Vendeur',
      counterpartForSeller: 'Acheteur',
      note: 'Note',
    },
    cta: 'Voir le détail',
    help: (email) =>
      `Des questions sur cette transaction ? Écrivez-nous à <a href="mailto:${email}">${email}</a>.`,
    footer:
      'Vous recevez cet e-mail car les notifications par e-mail sont activées.',
    stages: {
      STARTED: {
        badge: 'Démarrée',
        subject: (r) => `Votre transaction ${r} a démarré`,
        heading: 'Votre transaction a démarré',
        buyer:
          "Nous avons enregistré votre transaction et elle est en cours. Nous vous préviendrons dès qu'elle avancera.",
        seller:
          "Une transaction a démarré pour l'un de vos produits. Préparez l'envoi ou organisez la remise avec l'acheteur.",
      },
      IN_PROCESS: {
        badge: 'En cours',
        subject: (r) => `Votre transaction ${r} est en cours`,
        heading: 'Votre transaction est en cours',
        buyer:
          "Votre transaction avance comme prévu. Nous vous réécrirons une fois qu'elle sera terminée.",
        seller:
          "La transaction avance. Tenez l'acheteur informé si la livraison change.",
      },
      COMPLETED: {
        badge: 'Terminée',
        subject: (r) => `Votre transaction ${r} est terminée !`,
        heading: 'Transaction terminée !',
        buyer:
          "C'est fait ! Votre transaction s'est terminée avec succès. Merci d'avoir choisi une consommation plus consciente.",
        seller:
          'Félicitations ! La transaction est terminée et vos éco-points ont été crédités.',
      },
      CANCELLED: {
        badge: 'Annulée',
        subject: (r) => `Votre transaction ${r} a été annulée`,
        heading: 'Transaction annulée',
        buyer:
          'Cette transaction a été annulée. Si vous avez déjà payé, le débit sera annulé selon la politique de votre moyen de paiement.',
        seller:
          'Cette transaction a été annulée. Vos produits sont de nouveau disponibles sur la plateforme.',
      },
      REFUNDED: {
        badge: 'Remboursée',
        subject: (r) => `Votre transaction ${r} a été remboursée`,
        heading: 'Transaction remboursée',
        buyer:
          'Nous avons traité le remboursement de cette transaction. Selon votre banque, il peut prendre quelques jours ouvrés.',
        seller:
          'Un remboursement a été traité pour cette transaction. Le montant sera déduit de votre versement.',
      },
    },
  },
};

function render(locale: MailLocale, data: TransactionData) {
  const t = COPY[locale];
  const stage = t.stages[data.stage];
  const isBuyer = data.role === 'BUYER';
  const lead = isBuyer ? stage.buyer : stage.seller;
  const amount = formatAmount(data.amount, data.currency, locale);
  const url = safeUrl(data.detailUrl) ?? `${APP_BASE_URL}/profile/orders`;

  const textParts = [
    `${t.greeting(data.name)}. ${lead}`,
    `${t.labels.reference}: ${data.reference}`,
    `${t.labels.detail}: ${data.summary}`,
    amount ? `${t.labels.amount}: ${amount}` : null,
    data.note ? `${t.labels.note}: ${data.note}` : null,
    `${t.cta}: ${url}`,
  ].filter(Boolean);

  return {
    subject: stage.subject(data.reference),
    text: textParts.join(' — '),
    html: buildHtml(
      `
      ${header(t.tagline)}
      <div class="body">
        <span class="badge ${TONES[data.stage]}">${escapeHtml(stage.badge)}</span>
        <h2>${escapeHtml(stage.heading)}</h2>
        <p>${escapeHtml(t.greeting(data.name))}. ${escapeHtml(lead)}</p>
        ${specTable([
          [t.labels.reference, data.reference],
          [t.labels.detail, data.summary],
          [t.labels.amount, amount],
          [
            isBuyer
              ? t.labels.counterpartForBuyer
              : t.labels.counterpartForSeller,
            data.counterpartName,
          ],
          [t.labels.note, data.note],
        ])}
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

export const transactionTemplates: TemplateMap<TransactionData> = {
  es: (data) => render('es', data),
  en: (data) => render('en', data),
  fr: (data) => render('fr', data),
};
