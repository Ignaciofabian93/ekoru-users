import {
  APP_BASE_URL,
  buildHtml,
  escapeHtml,
  footer,
  header,
  safeUrl,
  type MailLocale,
  type TemplateMap,
} from './layout';

/**
 * A notification's own title and message as an email, with a button to act on
 * it. Used for account activity that has no richer template (service bookings
 * and quotations), so the email says exactly what the in-app feed says. The
 * copy comes from `NotificationTemplate` (admin-editable) or the registry
 * fallback, already interpolated.
 */
export interface NoticeData {
  name: string;
  title: string;
  message: string;
  /** Where to act on it. A relative path is resolved against the web app. */
  actionUrl?: string | null;
}

const COPY: Record<
  MailLocale,
  { heading: (name: string) => string; open: string; reasonFooter: string }
> = {
  es: {
    heading: (name) => `Hola, ${name}`,
    open: 'Ver detalle',
    reasonFooter:
      'Recibes este correo porque hubo actividad en una compra, venta, reserva o cotización de tu cuenta Ekoru.',
  },
  en: {
    heading: (name) => `Hi, ${name}`,
    open: 'View details',
    reasonFooter:
      'You received this email because of activity on a purchase, sale, booking or quotation in your Ekoru account.',
  },
  fr: {
    heading: (name) => `Bonjour, ${name}`,
    open: 'Voir le détail',
    reasonFooter:
      "Vous recevez cet e-mail en raison d'une activité sur un achat, une vente, une réservation ou un devis de votre compte Ekoru.",
  },
};

/** Absolute http(s) link for the button, or null when there is none to give. */
function actionLink(actionUrl: string | null | undefined): string | null {
  if (!actionUrl) return null;
  try {
    return safeUrl(new URL(actionUrl, APP_BASE_URL).toString());
  } catch {
    return null;
  }
}

const render = (locale: MailLocale) => (data: NoticeData) => {
  const t = COPY[locale];
  const link = actionLink(data.actionUrl);
  return {
    subject: data.title,
    text: [
      t.heading(data.name),
      data.title,
      data.message,
      link
        ? `${t.open}: ${new URL(data.actionUrl!, APP_BASE_URL).toString()}`
        : null,
    ]
      .filter(Boolean)
      .join('\n\n'),
    html: buildHtml(
      `
      ${header('Ekoru')}
      <div class="body">
        <h2>${escapeHtml(t.heading(data.name))}</h2>
        <p><strong>${escapeHtml(data.title)}</strong></p>
        <p>${escapeHtml(data.message)}</p>
        ${link ? `<div class="cta"><a href="${link}">${escapeHtml(t.open)}</a></div>` : ''}
      </div>
      ${footer(t.reasonFooter)}
    `,
      locale,
    ),
  };
};

export const noticeTemplates: TemplateMap<NoticeData> = {
  es: render('es'),
  en: render('en'),
  fr: render('fr'),
};
