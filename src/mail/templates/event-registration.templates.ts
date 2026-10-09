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
 * Confirmation to someone who reserved a place at a community event. Sent to
 * whatever address they typed — guests have no account — so it is not gated on
 * any preference: they asked for this place a moment ago.
 */
export interface EventRegistrationData {
  name: string;
  eventTitle: string;
  startDate?: Date | null;
  endDate?: Date | null;
  /** "Address, comuna, city" for in-person or hybrid events. */
  place?: string | null;
  /** Join link for online or hybrid events (validated http/https upstream). */
  onlineUrl?: string | null;
  /** Where to see the event (and cancel, when signed in). */
  eventUrl: string;
}

const COPY: Record<
  MailLocale,
  {
    subject: (title: string) => string;
    badge: string;
    heading: (name: string) => string;
    lead: (title: string) => string;
    labels: { event: string; date: string; place: string; online: string };
    join: string;
    view: string;
    cancelHint: string;
    reason: string;
  }
> = {
  es: {
    subject: (title) => `Tu cupo para "${title}" está reservado`,
    badge: 'Cupo reservado',
    heading: (name) => `¡Listo, ${name}!`,
    lead: (title) =>
      `Reservaste un cupo para ${title}. Estos son los detalles:`,
    labels: {
      event: 'Evento',
      date: 'Fecha',
      place: 'Lugar',
      online: 'En línea',
    },
    join: 'Unirse en línea',
    view: 'Ver el evento',
    cancelHint:
      'Si ya no puedes asistir, libera tu cupo desde la página del evento para que otra persona pueda ir.',
    reason:
      'Este correo fue enviado porque reservaste un cupo en un evento de la comunidad Ekoru.',
  },
  en: {
    subject: (title) => `Your place at "${title}" is reserved`,
    badge: 'Place reserved',
    heading: (name) => `You're in, ${name}!`,
    lead: (title) => `You reserved a place at ${title}. Here are the details:`,
    labels: { event: 'Event', date: 'Date', place: 'Place', online: 'Online' },
    join: 'Join online',
    view: 'View the event',
    cancelHint:
      'If you can no longer attend, release your place from the event page so someone else can go.',
    reason:
      'You received this email because you reserved a place at an Ekoru community event.',
  },
  fr: {
    subject: (title) => `Votre place pour « ${title} » est réservée`,
    badge: 'Place réservée',
    heading: (name) => `C'est fait, ${name} !`,
    lead: (title) =>
      `Vous avez réservé une place pour ${title}. Voici les détails :`,
    labels: {
      event: 'Événement',
      date: 'Date',
      place: 'Lieu',
      online: 'En ligne',
    },
    join: 'Rejoindre en ligne',
    view: "Voir l'événement",
    cancelHint:
      "Si vous ne pouvez plus venir, libérez votre place depuis la page de l'événement pour qu'une autre personne puisse y aller.",
    reason:
      'Vous recevez cet e-mail car vous avez réservé une place à un événement de la communauté Ekoru.',
  },
};

const render = (locale: MailLocale) => (data: EventRegistrationData) => {
  const t = COPY[locale];
  const when = data.startDate
    ? [data.startDate, data.endDate]
        .filter((d): d is Date => !!d)
        .map((d) => formatDateTime(d, locale))
        .join(' – ')
    : null;
  const rows: Array<[string, string | null | undefined]> = [
    [t.labels.event, data.eventTitle],
    [t.labels.date, when],
    [t.labels.place, data.place],
    [t.labels.online, data.onlineUrl ? t.join : null],
  ];
  const textRows = rows
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');

  return {
    subject: t.subject(data.eventTitle),
    text: [
      t.heading(data.name),
      t.lead(data.eventTitle),
      textRows,
      data.onlineUrl ? `${t.join}: ${data.onlineUrl}` : '',
      `${t.view}: ${data.eventUrl}`,
      t.cancelHint,
    ]
      .filter(Boolean)
      .join('\n\n'),
    html: buildHtml(
      `
      ${header('Comunidad Ekoru')}
      <div class="body">
        <span class="badge success">${escapeHtml(t.badge)}</span>
        <h2>${escapeHtml(t.heading(data.name))}</h2>
        <p>${escapeHtml(t.lead(data.eventTitle))}</p>
        ${specTable(rows)}
        ${
          data.onlineUrl
            ? `<div class="cta"><a href="${escapeHtml(data.onlineUrl)}">${escapeHtml(t.join)}</a></div>`
            : ''
        }
        <div class="cta">
          <a href="${escapeHtml(data.eventUrl)}">${escapeHtml(t.view)}</a>
        </div>
        <div class="divider"></div>
        <p>${escapeHtml(t.cancelHint)}</p>
      </div>
      ${footer(t.reason)}
    `,
      locale,
    ),
  };
};

export const eventRegistrationTemplates: TemplateMap<EventRegistrationData> = {
  es: render('es'),
  en: render('en'),
  fr: render('fr'),
};
