import {
  buildHtml,
  escapeHtml,
  footer,
  formatDateTime,
  header,
  specTable,
  type MailLocale,
  type TemplateMap,
} from './layout';

/**
 * Tells someone who had reserved a place that the event was cancelled. Sent to
 * every registrant, guests included, so it is not preference-gated.
 */
export interface EventCancelledData {
  name: string;
  eventTitle: string;
  startDate?: Date | null;
  /** The organiser's explanation, when they gave one. */
  reason?: string | null;
  /** Where to find other events. */
  communityUrl: string;
}

const COPY: Record<
  MailLocale,
  {
    subject: (title: string) => string;
    badge: string;
    heading: (name: string) => string;
    lead: (title: string) => string;
    labels: { event: string; date: string; reason: string };
    browse: string;
    reasonFooter: string;
  }
> = {
  es: {
    subject: (title) => `Se canceló "${title}"`,
    badge: 'Evento cancelado',
    heading: (name) => `Hola, ${name}`,
    lead: (title) =>
      `Lamentamos avisarte que el organizador canceló ${title}. Tu cupo quedó liberado; no tienes que hacer nada.`,
    labels: { event: 'Evento', date: 'Fecha', reason: 'Motivo' },
    browse: 'Ver otros eventos',
    reasonFooter:
      'Este correo fue enviado porque tenías un cupo reservado en este evento de la comunidad Ekoru.',
  },
  en: {
    subject: (title) => `"${title}" was cancelled`,
    badge: 'Event cancelled',
    heading: (name) => `Hi, ${name}`,
    lead: (title) =>
      `We're sorry to tell you the organiser cancelled ${title}. Your place was released; there is nothing you need to do.`,
    labels: { event: 'Event', date: 'Date', reason: 'Reason' },
    browse: 'See other events',
    reasonFooter:
      'You received this email because you had reserved a place at this Ekoru community event.',
  },
  fr: {
    subject: (title) => `« ${title} » a été annulé`,
    badge: 'Événement annulé',
    heading: (name) => `Bonjour, ${name}`,
    lead: (title) =>
      `Nous sommes désolés de vous informer que l'organisateur a annulé ${title}. Votre place a été libérée ; vous n'avez rien à faire.`,
    labels: { event: 'Événement', date: 'Date', reason: 'Motif' },
    browse: "Voir d'autres événements",
    reasonFooter:
      'Vous recevez cet e-mail car vous aviez réservé une place à cet événement de la communauté Ekoru.',
  },
};

const render = (locale: MailLocale) => (data: EventCancelledData) => {
  const t = COPY[locale];
  const when = data.startDate ? formatDateTime(data.startDate, locale) : null;
  const rows: Array<[string, string | null | undefined]> = [
    [t.labels.event, data.eventTitle],
    [t.labels.date, when],
    [t.labels.reason, data.reason],
  ];
  return {
    subject: t.subject(data.eventTitle),
    text: [
      t.heading(data.name),
      t.lead(data.eventTitle),
      rows
        .filter(([, v]) => v)
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n'),
      `${t.browse}: ${data.communityUrl}`,
    ]
      .filter(Boolean)
      .join('\n\n'),
    html: buildHtml(
      `
      ${header('Comunidad Ekoru')}
      <div class="body">
        <span class="badge">${escapeHtml(t.badge)}</span>
        <h2>${escapeHtml(t.heading(data.name))}</h2>
        <p>${escapeHtml(t.lead(data.eventTitle))}</p>
        ${specTable(rows)}
        <div class="cta">
          <a href="${escapeHtml(data.communityUrl)}">${escapeHtml(t.browse)}</a>
        </div>
      </div>
      ${footer(t.reasonFooter)}
    `,
      locale,
    ),
  };
};

export const eventCancelledTemplates: TemplateMap<EventCancelledData> = {
  es: render('es'),
  en: render('en'),
  fr: render('fr'),
};
