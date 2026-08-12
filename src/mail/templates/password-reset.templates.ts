import {
  APP_BASE_URL,
  SUPPORT_EMAIL,
  buildHtml,
  escapeHtml,
  footer,
  header,
  safeUrl,
  type MailLocale,
  type TemplateMap,
} from './layout';

export interface PasswordResetData {
  name: string;
  /** One-time link back into the web app, token included. */
  resetUrl: string;
  /** How long the link stays valid, in minutes — shown to the reader. */
  expiresInMinutes: number;
}

interface Copy {
  tagline: string;
  subject: string;
  heading: (name: string) => string;
  lead: string;
  cta: string;
  expiry: (minutes: number) => string;
  fallback: string;
  noticeTitle: string;
  notice: string;
  help: (email: string) => string;
  footer: string;
  text: (d: PasswordResetData) => string;
}

const COPY: Record<MailLocale, Copy> = {
  es: {
    tagline: 'Recuperación de contraseña',
    subject: 'Restablece tu contraseña de Ekoru',
    heading: (name) => `Hola, ${name}`,
    lead: 'Recibimos una solicitud para restablecer la contraseña de tu cuenta de Ekoru. Haz clic en el botón para elegir una nueva.',
    cta: 'Crear nueva contraseña',
    expiry: (minutes) =>
      `Por seguridad, este enlace caduca en ${minutes} minutos y solo puede usarse una vez.`,
    fallback:
      'Si el botón no funciona, copia y pega este enlace en tu navegador:',
    noticeTitle: '¿No solicitaste este cambio?',
    notice:
      'Ignora este correo: tu contraseña actual seguirá funcionando y nadie podrá cambiarla sin este enlace.',
    help: (email) =>
      `¿Necesitas ayuda? Escríbenos a <a href="mailto:${email}">${email}</a>.`,
    footer:
      'Recibiste este correo porque se solicitó un restablecimiento de contraseña para esta dirección.',
    text: (d) =>
      `Hola ${d.name}, recibimos una solicitud para restablecer tu contraseña de Ekoru. Abre este enlace para crear una nueva: ${d.resetUrl} — caduca en ${d.expiresInMinutes} minutos y solo puede usarse una vez. Si no lo solicitaste, ignora este correo.`,
  },

  en: {
    tagline: 'Password recovery',
    subject: 'Reset your Ekoru password',
    heading: (name) => `Hi, ${name}`,
    lead: 'We received a request to reset the password for your Ekoru account. Click the button below to choose a new one.',
    cta: 'Create a new password',
    expiry: (minutes) =>
      `For your security this link expires in ${minutes} minutes and can only be used once.`,
    fallback:
      "If the button doesn't work, copy and paste this link into your browser:",
    noticeTitle: "Didn't request this?",
    notice:
      'Ignore this email — your current password still works and nobody can change it without this link.',
    help: (email) =>
      `Need help? Write to us at <a href="mailto:${email}">${email}</a>.`,
    footer:
      'You received this email because a password reset was requested for this address.',
    text: (d) =>
      `Hi ${d.name}, we received a request to reset your Ekoru password. Open this link to choose a new one: ${d.resetUrl} — it expires in ${d.expiresInMinutes} minutes and can only be used once. If you didn't request it, ignore this email.`,
  },

  fr: {
    tagline: 'Récupération du mot de passe',
    subject: 'Réinitialisez votre mot de passe Ekoru',
    heading: (name) => `Bonjour, ${name}`,
    lead: 'Nous avons reçu une demande de réinitialisation du mot de passe de votre compte Ekoru. Cliquez sur le bouton pour en choisir un nouveau.',
    cta: 'Créer un nouveau mot de passe',
    expiry: (minutes) =>
      `Pour votre sécurité, ce lien expire dans ${minutes} minutes et ne peut être utilisé qu'une seule fois.`,
    fallback:
      'Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :',
    noticeTitle: "Vous n'êtes pas à l'origine de cette demande ?",
    notice:
      'Ignorez cet e-mail : votre mot de passe actuel reste valable et personne ne peut le changer sans ce lien.',
    help: (email) =>
      `Besoin d'aide ? Écrivez-nous à <a href="mailto:${email}">${email}</a>.`,
    footer:
      'Vous recevez cet e-mail car une réinitialisation de mot de passe a été demandée pour cette adresse.',
    text: (d) =>
      `Bonjour ${d.name}, nous avons reçu une demande de réinitialisation de votre mot de passe Ekoru. Ouvrez ce lien pour en choisir un nouveau : ${d.resetUrl} — il expire dans ${d.expiresInMinutes} minutes et ne peut servir qu'une fois. Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.`,
  },
};

function render(locale: MailLocale, data: PasswordResetData) {
  const t = COPY[locale];
  // The URL is built by this service, but it still goes through safeUrl so a
  // misconfigured base URL can never turn the CTA into a `javascript:` link.
  const url = safeUrl(data.resetUrl) ?? APP_BASE_URL;

  return {
    subject: t.subject,
    text: t.text(data),
    html: buildHtml(
      `
      ${header(t.tagline)}
      <div class="body">
        <h2>${escapeHtml(t.heading(data.name))}</h2>
        <p>${escapeHtml(t.lead)}</p>
        <div class="cta">
          <a href="${url}">${escapeHtml(t.cta)}</a>
        </div>
        <p>${escapeHtml(t.expiry(data.expiresInMinutes))}</p>
        <div class="divider"></div>
        <p>${escapeHtml(t.fallback)}<br /><a href="${url}">${url}</a></p>
        <div class="notice">
          <p><strong>${escapeHtml(t.noticeTitle)}</strong><br />${escapeHtml(t.notice)}</p>
        </div>
        <p>${t.help(SUPPORT_EMAIL)}</p>
      </div>
      ${footer(t.footer)}
    `,
      locale,
    ),
  };
}

export const passwordResetTemplates: TemplateMap<PasswordResetData> = {
  es: (data) => render('es', data),
  en: (data) => render('en', data),
  fr: (data) => render('fr', data),
};
