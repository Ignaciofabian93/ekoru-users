import {
  APP_BASE_URL,
  SUPPORT_EMAIL,
  buildHtml,
  escapeHtml,
  footer,
  formatDateTime,
  header,
  specTable,
  type MailLocale,
  type TemplateMap,
} from './layout';

export type DeviceKind = 'DESKTOP' | 'MOBILE' | 'TABLET' | 'UNKNOWN';

export interface LoginAlertData {
  name: string;
  /** Parsed from the User-Agent by `parseUserAgent`. */
  browser: string;
  operatingSystem: string;
  deviceKind: DeviceKind;
  /** Raw User-Agent — shown verbatim so a suspicious client is identifiable. */
  userAgent?: string | null;
  ipAddress?: string | null;
  /** Optional human-readable location ("Santiago, Chile") if geo-IP is wired. */
  location?: string | null;
  occurredAt: Date;
}

const SECURITY_URL = `${APP_BASE_URL}/account/security`;

interface Copy {
  tagline: string;
  subject: string;
  heading: (name: string) => string;
  lead: string;
  labels: {
    when: string;
    device: string;
    browser: string;
    os: string;
    ip: string;
    location: string;
    userAgent: string;
  };
  deviceKinds: Record<DeviceKind, string>;
  noticeTitle: string;
  notice: string;
  cta: string;
  help: (email: string) => string;
  footer: string;
  text: (d: LoginAlertData, when: string, device: string) => string;
}

const COPY: Record<MailLocale, Copy> = {
  es: {
    tagline: 'Alerta de seguridad',
    subject: 'Nuevo inicio de sesión en tu cuenta Ekoru',
    heading: (name) => `Hola, ${name}`,
    lead: 'Detectamos un inicio de sesión en tu cuenta de Ekoru. Si fuiste tú, no necesitas hacer nada.',
    labels: {
      when: 'Fecha y hora',
      device: 'Tipo de dispositivo',
      browser: 'Navegador',
      os: 'Sistema operativo',
      ip: 'Dirección IP',
      location: 'Ubicación aproximada',
      userAgent: 'Identificador del cliente',
    },
    deviceKinds: {
      DESKTOP: 'Computador de escritorio',
      MOBILE: 'Teléfono móvil',
      TABLET: 'Tablet',
      UNKNOWN: 'Desconocido',
    },
    noticeTitle: '¿No reconoces este acceso?',
    notice:
      'Cambia tu contraseña de inmediato y activa la verificación en dos pasos desde la configuración de seguridad de tu cuenta.',
    cta: 'Revisar seguridad de mi cuenta',
    help: (email) =>
      `¿Necesitas ayuda? Escríbenos a <a href="mailto:${email}">${email}</a>.`,
    footer:
      'Recibiste este correo porque tienes activadas las alertas de inicio de sesión.',
    text: (d, when, device) =>
      `Hola ${d.name}, detectamos un inicio de sesión en tu cuenta de Ekoru el ${when}. Dispositivo: ${device}. IP: ${d.ipAddress ?? 'no disponible'}. Si no fuiste tú, cambia tu contraseña en ${SECURITY_URL}.`,
  },

  en: {
    tagline: 'Security alert',
    subject: 'New sign-in to your Ekoru account',
    heading: (name) => `Hi, ${name}`,
    lead: "We detected a sign-in to your Ekoru account. If this was you, there's nothing to do.",
    labels: {
      when: 'Date and time',
      device: 'Device type',
      browser: 'Browser',
      os: 'Operating system',
      ip: 'IP address',
      location: 'Approximate location',
      userAgent: 'Client identifier',
    },
    deviceKinds: {
      DESKTOP: 'Desktop computer',
      MOBILE: 'Mobile phone',
      TABLET: 'Tablet',
      UNKNOWN: 'Unknown',
    },
    noticeTitle: "Don't recognise this sign-in?",
    notice:
      'Change your password right away and turn on two-factor authentication from your account security settings.',
    cta: 'Review my account security',
    help: (email) =>
      `Need help? Write to us at <a href="mailto:${email}">${email}</a>.`,
    footer: 'You received this email because login alerts are enabled.',
    text: (d, when, device) =>
      `Hi ${d.name}, we detected a sign-in to your Ekoru account on ${when}. Device: ${device}. IP: ${d.ipAddress ?? 'unavailable'}. If this wasn't you, change your password at ${SECURITY_URL}.`,
  },

  fr: {
    tagline: 'Alerte de sécurité',
    subject: 'Nouvelle connexion à votre compte Ekoru',
    heading: (name) => `Bonjour, ${name}`,
    lead: "Nous avons détecté une connexion à votre compte Ekoru. S'il s'agit de vous, aucune action n'est nécessaire.",
    labels: {
      when: 'Date et heure',
      device: "Type d'appareil",
      browser: 'Navigateur',
      os: "Système d'exploitation",
      ip: 'Adresse IP',
      location: 'Localisation approximative',
      userAgent: 'Identifiant du client',
    },
    deviceKinds: {
      DESKTOP: 'Ordinateur de bureau',
      MOBILE: 'Téléphone mobile',
      TABLET: 'Tablette',
      UNKNOWN: 'Inconnu',
    },
    noticeTitle: 'Vous ne reconnaissez pas cette connexion ?',
    notice:
      'Changez votre mot de passe immédiatement et activez la double authentification depuis les paramètres de sécurité de votre compte.',
    cta: 'Vérifier la sécurité de mon compte',
    help: (email) =>
      `Besoin d'aide ? Écrivez-nous à <a href="mailto:${email}">${email}</a>.`,
    footer:
      'Vous recevez cet e-mail car les alertes de connexion sont activées.',
    text: (d, when, device) =>
      `Bonjour ${d.name}, nous avons détecté une connexion à votre compte Ekoru le ${when}. Appareil : ${device}. IP : ${d.ipAddress ?? 'indisponible'}. Si ce n'était pas vous, changez votre mot de passe sur ${SECURITY_URL}.`,
  },
};

function render(locale: MailLocale, data: LoginAlertData) {
  const t = COPY[locale];
  const when = formatDateTime(data.occurredAt, locale);
  const deviceLabel = t.deviceKinds[data.deviceKind];

  return {
    subject: t.subject,
    text: t.text(data, when, `${data.browser} · ${data.operatingSystem}`),
    html: buildHtml(
      `
      ${header(t.tagline)}
      <div class="body">
        <h2>${escapeHtml(t.heading(data.name))}</h2>
        <p>${escapeHtml(t.lead)}</p>
        ${specTable([
          [t.labels.when, when],
          [t.labels.device, deviceLabel],
          [t.labels.browser, data.browser],
          [t.labels.os, data.operatingSystem],
          [t.labels.ip, data.ipAddress],
          [t.labels.location, data.location],
          [t.labels.userAgent, data.userAgent],
        ])}
        <div class="notice">
          <p><strong>${escapeHtml(t.noticeTitle)}</strong><br />${escapeHtml(t.notice)}</p>
        </div>
        <div class="cta">
          <a href="${SECURITY_URL}">${escapeHtml(t.cta)}</a>
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

export const loginAlertTemplates: TemplateMap<LoginAlertData> = {
  es: (data) => render('es', data),
  en: (data) => render('en', data),
  fr: (data) => render('fr', data),
};
