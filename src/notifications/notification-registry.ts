import { NotificationPriority, NotificationType } from '@prisma/client';
import type { MailLocale } from '../mail/templates';

/**
 * Which HTML email renders a notification, if any. Maps onto the templates in
 * `src/mail/templates/`. Types without an entry are in-app (and push) only.
 */
export type EmailKind = 'transaction' | 'dealOffer' | 'loginAlert';

/**
 * Which `SellerPreferences` column gates the email for this notification.
 *
 * Security notices ride `enableLoginAlerts` rather than the general email
 * switch: muting activity mail should not mute "someone signed in as you".
 */
export type EmailGate = 'enableEmailNotifications' | 'enableLoginAlerts';

export interface NotificationSpec {
  priority: NotificationPriority;
  /** Absent = no email for this type. */
  email?: EmailKind;
  emailGate: EmailGate;
  /** Whether this type is worth waking a phone for. */
  push: boolean;
  /**
   * Copy used when no `NotificationTemplate` row exists for the type. Admins
   * can override the text in the panel; this keeps the feed working before
   * they do, and stops a deleted template from producing a blank notification.
   * `{{placeholders}}` are filled from the emit payload.
   */
  fallback: Record<MailLocale, { title: string; message: string }>;
}

/** Generic copy for types nobody has written a template or fallback for yet. */
const GENERIC: NotificationSpec['fallback'] = {
  es: { title: 'Novedades en Ekoru', message: 'Tienes una actualización.' },
  en: { title: 'Ekoru update', message: 'You have an update.' },
  fr: { title: 'Nouveautés Ekoru', message: 'Vous avez une mise à jour.' },
};

const DEFAULTS = {
  priority: NotificationPriority.MEDIUM,
  emailGate: 'enableEmailNotifications' as EmailGate,
  push: true,
  fallback: GENERIC,
};

/**
 * The contract between domain events and delivery.
 *
 * Adding a notification means adding a row here — nothing else needs to know
 * about channels, priorities or gating. Types absent from this map still work:
 * they fall back to in-app + push with generic copy, so a new
 * `NotificationType` can never crash `emit()`.
 */
export const NOTIFICATION_REGISTRY: Partial<
  Record<NotificationType, NotificationSpec>
> = {
  // ─── P2P deals ────────────────────────────────────────────────────────────
  [NotificationType.SALE_PROPOSAL]: {
    ...DEFAULTS,
    priority: NotificationPriority.HIGH,
    email: 'dealOffer',
    fallback: {
      es: {
        title: 'Nueva propuesta de compra',
        message: '{{actorName}} quiere comprar {{requestedProductTitle}}.',
      },
      en: {
        title: 'New purchase proposal',
        message: '{{actorName}} wants to buy {{requestedProductTitle}}.',
      },
      fr: {
        title: "Nouvelle proposition d'achat",
        message: '{{actorName}} souhaite acheter {{requestedProductTitle}}.',
      },
    },
  },

  [NotificationType.EXCHANGE_PROPOSAL]: {
    ...DEFAULTS,
    priority: NotificationPriority.HIGH,
    email: 'dealOffer',
    fallback: {
      es: {
        title: 'Nueva propuesta de intercambio',
        message:
          '{{actorName}} te propone un intercambio por {{requestedProductTitle}}.',
      },
      en: {
        title: 'New exchange proposal',
        message:
          '{{actorName}} is proposing a trade for {{requestedProductTitle}}.',
      },
      fr: {
        title: "Nouvelle proposition d'échange",
        message:
          '{{actorName}} vous propose un échange contre {{requestedProductTitle}}.',
      },
    },
  },

  [NotificationType.EXCHANGE_ACCEPTED]: {
    ...DEFAULTS,
    priority: NotificationPriority.HIGH,
    email: 'transaction',
    fallback: {
      es: {
        title: 'Trato aceptado',
        message: 'Tu trato {{reference}} está en curso. Coordina la entrega.',
      },
      en: {
        title: 'Deal accepted',
        message: 'Your deal {{reference}} is underway. Arrange the handover.',
      },
      fr: {
        title: 'Accord accepté',
        message:
          'Votre accord {{reference}} est en cours. Organisez la remise.',
      },
    },
  },

  [NotificationType.EXCHANGE_COMPLETED]: {
    ...DEFAULTS,
    email: 'transaction',
    fallback: {
      es: {
        title: 'Trato completado',
        message: 'El trato {{reference}} se completó. ¡Ganaste eco-puntos!',
      },
      en: {
        title: 'Deal completed',
        message: 'Deal {{reference}} is complete. You earned eco-points!',
      },
      fr: {
        title: 'Accord terminé',
        message:
          "L'accord {{reference}} est terminé. Vous avez gagné des éco-points !",
      },
    },
  },

  [NotificationType.EXCHANGE_DECLINED]: {
    ...DEFAULTS,
    email: 'transaction',
    fallback: {
      es: {
        title: 'Trato cancelado',
        message: 'El trato {{reference}} fue cancelado.',
      },
      en: {
        title: 'Deal cancelled',
        message: 'Deal {{reference}} was cancelled.',
      },
      fr: {
        title: 'Accord annulé',
        message: "L'accord {{reference}} a été annulé.",
      },
    },
  },

  // ─── Orders ───────────────────────────────────────────────────────────────
  [NotificationType.ORDER_RECEIVED]: {
    ...DEFAULTS,
    priority: NotificationPriority.HIGH,
    email: 'transaction',
    fallback: {
      es: {
        title: 'Nueva orden {{reference}}',
        message: 'Se ha iniciado una transacción por {{summary}}.',
      },
      en: {
        title: 'New order {{reference}}',
        message: 'A transaction has started for {{summary}}.',
      },
      fr: {
        title: 'Nouvelle commande {{reference}}',
        message: 'Une transaction a démarré pour {{summary}}.',
      },
    },
  },

  [NotificationType.ORDER_CONFIRMED]: {
    ...DEFAULTS,
    email: 'transaction',
    fallback: {
      es: {
        title: 'Orden {{reference}} confirmada',
        message: 'El pago fue recibido y la orden está en proceso.',
      },
      en: {
        title: 'Order {{reference}} confirmed',
        message: 'Payment received — the order is now in process.',
      },
      fr: {
        title: 'Commande {{reference}} confirmée',
        message: 'Paiement reçu — la commande est en cours.',
      },
    },
  },

  [NotificationType.ORDER_SHIPPED]: {
    ...DEFAULTS,
    email: 'transaction',
    fallback: {
      es: {
        title: 'Orden {{reference}} en camino',
        message: '{{note}}',
      },
      en: { title: 'Order {{reference}} on its way', message: '{{note}}' },
      fr: { title: 'Commande {{reference}} en route', message: '{{note}}' },
    },
  },

  [NotificationType.ORDER_DELIVERED]: {
    ...DEFAULTS,
    email: 'transaction',
    fallback: {
      es: {
        title: 'Orden {{reference}} entregada',
        message: '¡Tu pedido fue entregado! Cuéntanos cómo te fue.',
      },
      en: {
        title: 'Order {{reference}} delivered',
        message: 'Your order was delivered! Tell us how it went.',
      },
      fr: {
        title: 'Commande {{reference}} livrée',
        message:
          'Votre commande a été livrée ! Dites-nous comment ça s’est passé.',
      },
    },
  },

  [NotificationType.ORDER_CANCELLED]: {
    ...DEFAULTS,
    email: 'transaction',
    fallback: {
      es: {
        title: 'Orden {{reference}} cancelada',
        message: 'Esta orden fue cancelada.',
      },
      en: {
        title: 'Order {{reference}} cancelled',
        message: 'This order was cancelled.',
      },
      fr: {
        title: 'Commande {{reference}} annulée',
        message: 'Cette commande a été annulée.',
      },
    },
  },

  [NotificationType.PAYMENT_REFUNDED]: {
    ...DEFAULTS,
    email: 'transaction',
    fallback: {
      es: {
        title: 'Reembolso de {{reference}}',
        message: 'Procesamos el reembolso de esta transacción.',
      },
      en: {
        title: 'Refund for {{reference}}',
        message: 'We processed the refund for this transaction.',
      },
      fr: {
        title: 'Remboursement de {{reference}}',
        message: 'Nous avons traité le remboursement de cette transaction.',
      },
    },
  },

  // ─── Services: quotations ─────────────────────────────────────────────────
  [NotificationType.QUOTATION_REQUEST]: {
    ...DEFAULTS,
    priority: NotificationPriority.HIGH,
    fallback: {
      es: {
        title: 'Nueva solicitud de cotización',
        message: '{{actorName}} solicitó una cotización para {{serviceName}}.',
      },
      en: {
        title: 'New quote request',
        message: '{{actorName}} requested a quote for {{serviceName}}.',
      },
      fr: {
        title: 'Nouvelle demande de devis',
        message: '{{actorName}} a demandé un devis pour {{serviceName}}.',
      },
    },
  },

  [NotificationType.QUOTATION_RECEIVED]: {
    ...DEFAULTS,
    priority: NotificationPriority.HIGH,
    fallback: {
      es: {
        title: 'Recibiste una cotización',
        message: '{{actorName}} respondió tu solicitud para {{serviceName}}.',
      },
      en: {
        title: 'You received a quote',
        message: '{{actorName}} replied to your request for {{serviceName}}.',
      },
      fr: {
        title: 'Vous avez reçu un devis',
        message:
          '{{actorName}} a répondu à votre demande pour {{serviceName}}.',
      },
    },
  },

  [NotificationType.QUOTATION_ACCEPTED]: {
    ...DEFAULTS,
    priority: NotificationPriority.HIGH,
    fallback: {
      es: {
        title: 'Cotización aceptada',
        message: '{{actorName}} aceptó tu cotización para {{serviceName}}.',
      },
      en: {
        title: 'Quote accepted',
        message: '{{actorName}} accepted your quote for {{serviceName}}.',
      },
      fr: {
        title: 'Devis accepté',
        message: '{{actorName}} a accepté votre devis pour {{serviceName}}.',
      },
    },
  },

  [NotificationType.QUOTATION_DECLINED]: {
    ...DEFAULTS,
    fallback: {
      es: {
        title: 'Cotización rechazada',
        message: 'La cotización para {{serviceName}} fue rechazada. {{note}}',
      },
      en: {
        title: 'Quote declined',
        message: 'The quote for {{serviceName}} was declined. {{note}}',
      },
      fr: {
        title: 'Devis refusé',
        message: 'Le devis pour {{serviceName}} a été refusé. {{note}}',
      },
    },
  },

  [NotificationType.QUOTATION_COMPLETED]: {
    ...DEFAULTS,
    fallback: {
      es: {
        title: 'Servicio finalizado',
        message: 'El servicio {{serviceName}} se marcó como completado.',
      },
      en: {
        title: 'Service finished',
        message: '{{serviceName}} was marked as completed.',
      },
      fr: {
        title: 'Service terminé',
        message: '{{serviceName}} a été marqué comme terminé.',
      },
    },
  },

  // ─── Services: bookings ───────────────────────────────────────────────────
  [NotificationType.BOOKING_REQUEST]: {
    ...DEFAULTS,
    priority: NotificationPriority.HIGH,
    fallback: {
      es: {
        title: 'Nueva reserva',
        message:
          '{{actorName}} reservó {{serviceName}} para el {{scheduledFor}}.',
      },
      en: {
        title: 'New booking',
        message: '{{actorName}} booked {{serviceName}} for {{scheduledFor}}.',
      },
      fr: {
        title: 'Nouvelle réservation',
        message:
          '{{actorName}} a réservé {{serviceName}} pour le {{scheduledFor}}.',
      },
    },
  },

  [NotificationType.BOOKING_CONFIRMED]: {
    ...DEFAULTS,
    priority: NotificationPriority.HIGH,
    fallback: {
      es: {
        title: 'Reserva confirmada',
        message:
          'Tu reserva de {{serviceName}} quedó confirmada para el {{scheduledFor}}.',
      },
      en: {
        title: 'Booking confirmed',
        message:
          'Your {{serviceName}} booking is confirmed for {{scheduledFor}}.',
      },
      fr: {
        title: 'Réservation confirmée',
        message:
          'Votre réservation {{serviceName}} est confirmée pour le {{scheduledFor}}.',
      },
    },
  },

  [NotificationType.BOOKING_CANCELLED]: {
    ...DEFAULTS,
    priority: NotificationPriority.HIGH,
    fallback: {
      es: {
        title: 'Reserva cancelada',
        message: 'La reserva de {{serviceName}} fue cancelada. {{note}}',
      },
      en: {
        title: 'Booking cancelled',
        message: 'The {{serviceName}} booking was cancelled. {{note}}',
      },
      fr: {
        title: 'Réservation annulée',
        message: 'La réservation {{serviceName}} a été annulée. {{note}}',
      },
    },
  },

  [NotificationType.BOOKING_COMPLETED]: {
    ...DEFAULTS,
    fallback: {
      es: {
        title: 'Servicio completado',
        message: '{{serviceName}} se completó. ¡Cuéntanos cómo te fue!',
      },
      en: {
        title: 'Service completed',
        message: '{{serviceName}} is complete. Tell us how it went!',
      },
      fr: {
        title: 'Service terminé',
        message:
          "{{serviceName}} est terminé. Dites-nous comment ça s'est passé !",
      },
    },
  },

  // ─── Security ─────────────────────────────────────────────────────────────
  /**
   * The only type gated on `enableLoginAlerts`. Its email copy lives in code
   * (`mail/templates/login-alert.templates.ts`) and is intentionally NOT
   * admin-editable — an editable security email with editable links is a
   * phishing vector that would send from our own domain. The in-app fallback
   * below is also never read from `NotificationTemplate`; see
   * `NotificationRenderer`.
   */
  [NotificationType.SECURITY_LOGIN_ALERT]: {
    priority: NotificationPriority.HIGH,
    email: 'loginAlert',
    emailGate: 'enableLoginAlerts',
    push: true,
    fallback: {
      es: {
        title: 'Nuevo inicio de sesión',
        message: 'Se inició sesión desde {{browser}} · {{operatingSystem}}.',
      },
      en: {
        title: 'New sign-in',
        message: 'A sign-in happened from {{browser}} · {{operatingSystem}}.',
      },
      fr: {
        title: 'Nouvelle connexion',
        message:
          'Une connexion a eu lieu depuis {{browser}} · {{operatingSystem}}.',
      },
    },
  },
};

/** Types whose copy must never come from an admin-editable template. */
export const SECURITY_TYPES: ReadonlySet<NotificationType> = new Set([
  NotificationType.SECURITY_LOGIN_ALERT,
]);

export function specFor(type: NotificationType): NotificationSpec {
  return NOTIFICATION_REGISTRY[type] ?? DEFAULTS;
}
