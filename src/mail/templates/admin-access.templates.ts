import {
  SUPPORT_EMAIL,
  buildHtml,
  escapeHtml,
  footer,
  header,
  safeUrl,
  type MailLocale,
  type TemplateMap,
} from './layout';

/**
 * A one-time link into the admin panel to choose a password (USR-15). Two
 * reasons to get one: an invite, when a business's paid plan opens its panel
 * or its owner adds a team member, and a reset, from the panel's "forgot
 * password". Never gated on a preference: without it the admin cannot sign in.
 */
export interface AdminAccessData {
  kind: 'invite' | 'reset';
  name: string;
  /** The business the panel account belongs to. */
  businessName?: string | null;
  /** One-time link to the panel's set-password page, token included. */
  url: string;
  /** The panel's login page, for after the password is set. */
  loginUrl: string;
  /** How long the link stays valid, already worded for the reader. */
  expiresIn: string;
  /** The account's sign-in address, which may differ from the store's. */
  email: string;
}

interface Copy {
  tagline: string;
  subject: (d: AdminAccessData) => string;
  heading: (name: string) => string;
  lead: (d: AdminAccessData) => string;
  cta: string;
  emailLine: (email: string) => string;
  expiry: (expiresIn: string) => string;
  fallback: string;
  loginLine: string;
  noticeTitle: string;
  notice: string;
  help: (email: string) => string;
  footer: string;
  text: (d: AdminAccessData) => string;
}

const COPY: Record<'invite' | 'reset', Record<MailLocale, Copy>> = {
  invite: {
    es: {
      tagline: 'Tu acceso al panel de negocios',
      subject: (d) =>
        d.businessName
          ? `Tu acceso al panel de ${d.businessName} en Ekoru`
          : 'Tu acceso al panel de Ekoru',
      heading: (name) => `Hola, ${name}`,
      lead: (d) =>
        `Ya tienes una cuenta en el panel de Ekoru${d.businessName ? ` para ${d.businessName}` : ''}. Desde ahí puedes publicar todo tu catálogo con una planilla, ver tus ventas y manejar tu equipo. Elige tu contraseña para entrar.`,
      cta: 'Elegir mi contraseña',
      emailLine: (email) => `Entrarás con este correo: ${email}`,
      expiry: (expiresIn) =>
        `Este enlace caduca en ${expiresIn} y solo puede usarse una vez. Si caduca, pide uno nuevo con "¿Olvidaste tu contraseña?" en el panel.`,
      fallback:
        'Si el botón no funciona, copia y pega este enlace en tu navegador:',
      loginLine: 'Después, entra al panel aquí:',
      noticeTitle: '¿No esperabas este correo?',
      notice:
        'Si no reconoces este negocio, ignóralo: nadie podrá entrar con esta cuenta sin este enlace.',
      help: (email) =>
        `¿Necesitas ayuda? Escríbenos a <a href="mailto:${email}">${email}</a>.`,
      footer:
        'Recibiste este correo porque se creó una cuenta del panel de Ekoru con esta dirección.',
      text: (d) =>
        `Hola ${d.name}, ya tienes una cuenta en el panel de Ekoru${d.businessName ? ` para ${d.businessName}` : ''}. Entrarás con ${d.email}. Elige tu contraseña aquí: ${d.url} (caduca en ${d.expiresIn} y solo sirve una vez). Después, entra en ${d.loginUrl}.`,
    },
    en: {
      tagline: 'Your access to the business panel',
      subject: (d) =>
        d.businessName
          ? `Your access to the ${d.businessName} panel on Ekoru`
          : 'Your access to the Ekoru panel',
      heading: (name) => `Hi, ${name}`,
      lead: (d) =>
        `You now have an account in the Ekoru panel${d.businessName ? ` for ${d.businessName}` : ''}. From there you can publish your whole catalog with a spreadsheet, see your sales and manage your team. Choose your password to sign in.`,
      cta: 'Choose my password',
      emailLine: (email) => `You will sign in with this address: ${email}`,
      expiry: (expiresIn) =>
        `This link expires in ${expiresIn} and can only be used once. If it expires, ask for a new one with "Forgot your password?" in the panel.`,
      fallback:
        "If the button doesn't work, copy and paste this link into your browser:",
      loginLine: 'Afterwards, sign in to the panel here:',
      noticeTitle: "Weren't expecting this?",
      notice:
        "If you don't recognise this business, ignore this email: nobody can use this account without this link.",
      help: (email) =>
        `Need help? Write to us at <a href="mailto:${email}">${email}</a>.`,
      footer:
        'You received this email because an Ekoru panel account was created with this address.',
      text: (d) =>
        `Hi ${d.name}, you now have an account in the Ekoru panel${d.businessName ? ` for ${d.businessName}` : ''}. You will sign in with ${d.email}. Choose your password here: ${d.url} (it expires in ${d.expiresIn} and works once). Afterwards, sign in at ${d.loginUrl}.`,
    },
    fr: {
      tagline: 'Votre accès au panneau entreprise',
      subject: (d) =>
        d.businessName
          ? `Votre accès au panneau de ${d.businessName} sur Ekoru`
          : 'Votre accès au panneau Ekoru',
      heading: (name) => `Bonjour, ${name}`,
      lead: (d) =>
        `Vous avez maintenant un compte dans le panneau Ekoru${d.businessName ? ` pour ${d.businessName}` : ''}. Vous pouvez y publier tout votre catalogue avec un tableur, suivre vos ventes et gérer votre équipe. Choisissez votre mot de passe pour vous connecter.`,
      cta: 'Choisir mon mot de passe',
      emailLine: (email) =>
        `Vous vous connecterez avec cette adresse : ${email}`,
      expiry: (expiresIn) =>
        `Ce lien expire dans ${expiresIn} et ne peut servir qu'une fois. S'il expire, demandez-en un nouveau avec « Mot de passe oublié ? » dans le panneau.`,
      fallback:
        'Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :',
      loginLine: 'Ensuite, connectez-vous au panneau ici :',
      noticeTitle: 'Vous ne vous attendiez pas à cet e-mail ?',
      notice:
        'Si vous ne connaissez pas cette entreprise, ignorez-le : personne ne peut utiliser ce compte sans ce lien.',
      help: (email) =>
        `Besoin d'aide ? Écrivez-nous à <a href="mailto:${email}">${email}</a>.`,
      footer:
        'Vous recevez cet e-mail car un compte du panneau Ekoru a été créé avec cette adresse.',
      text: (d) =>
        `Bonjour ${d.name}, vous avez maintenant un compte dans le panneau Ekoru${d.businessName ? ` pour ${d.businessName}` : ''}. Vous vous connecterez avec ${d.email}. Choisissez votre mot de passe ici : ${d.url} (expire dans ${d.expiresIn}, une seule utilisation). Ensuite, connectez-vous sur ${d.loginUrl}.`,
    },
  },
  reset: {
    es: {
      tagline: 'Recuperación de contraseña del panel',
      subject: () => 'Restablece tu contraseña del panel de Ekoru',
      heading: (name) => `Hola, ${name}`,
      lead: () =>
        'Recibimos una solicitud para restablecer la contraseña de tu cuenta del panel de Ekoru. Haz clic en el botón para elegir una nueva.',
      cta: 'Crear nueva contraseña',
      emailLine: (email) => `Cuenta: ${email}`,
      expiry: (expiresIn) =>
        `Por seguridad, este enlace caduca en ${expiresIn} y solo puede usarse una vez.`,
      fallback:
        'Si el botón no funciona, copia y pega este enlace en tu navegador:',
      loginLine: 'Después, entra al panel aquí:',
      noticeTitle: '¿No solicitaste este cambio?',
      notice:
        'Ignora este correo: tu contraseña actual seguirá funcionando y nadie podrá cambiarla sin este enlace.',
      help: (email) =>
        `¿Necesitas ayuda? Escríbenos a <a href="mailto:${email}">${email}</a>.`,
      footer:
        'Recibiste este correo porque se solicitó un restablecimiento de contraseña del panel para esta dirección.',
      text: (d) =>
        `Hola ${d.name}, recibimos una solicitud para restablecer tu contraseña del panel de Ekoru. Abre este enlace para crear una nueva: ${d.url} (caduca en ${d.expiresIn} y solo sirve una vez). Si no lo solicitaste, ignora este correo.`,
    },
    en: {
      tagline: 'Panel password recovery',
      subject: () => 'Reset your Ekoru panel password',
      heading: (name) => `Hi, ${name}`,
      lead: () =>
        'We received a request to reset the password of your Ekoru panel account. Click the button below to choose a new one.',
      cta: 'Create a new password',
      emailLine: (email) => `Account: ${email}`,
      expiry: (expiresIn) =>
        `For your security this link expires in ${expiresIn} and can only be used once.`,
      fallback:
        "If the button doesn't work, copy and paste this link into your browser:",
      loginLine: 'Afterwards, sign in to the panel here:',
      noticeTitle: "Didn't request this?",
      notice:
        'Ignore this email: your current password still works and nobody can change it without this link.',
      help: (email) =>
        `Need help? Write to us at <a href="mailto:${email}">${email}</a>.`,
      footer:
        'You received this email because a panel password reset was requested for this address.',
      text: (d) =>
        `Hi ${d.name}, we received a request to reset your Ekoru panel password. Open this link to choose a new one: ${d.url} (it expires in ${d.expiresIn} and works once). If you didn't request it, ignore this email.`,
    },
    fr: {
      tagline: 'Récupération du mot de passe du panneau',
      subject: () => 'Réinitialisez votre mot de passe du panneau Ekoru',
      heading: (name) => `Bonjour, ${name}`,
      lead: () =>
        'Nous avons reçu une demande de réinitialisation du mot de passe de votre compte du panneau Ekoru. Cliquez sur le bouton pour en choisir un nouveau.',
      cta: 'Créer un nouveau mot de passe',
      emailLine: (email) => `Compte : ${email}`,
      expiry: (expiresIn) =>
        `Pour votre sécurité, ce lien expire dans ${expiresIn} et ne peut servir qu'une fois.`,
      fallback:
        'Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :',
      loginLine: 'Ensuite, connectez-vous au panneau ici :',
      noticeTitle: "Vous n'êtes pas à l'origine de cette demande ?",
      notice:
        'Ignorez cet e-mail : votre mot de passe actuel reste valable et personne ne peut le changer sans ce lien.',
      help: (email) =>
        `Besoin d'aide ? Écrivez-nous à <a href="mailto:${email}">${email}</a>.`,
      footer:
        'Vous recevez cet e-mail car une réinitialisation du mot de passe du panneau a été demandée pour cette adresse.',
      text: (d) =>
        `Bonjour ${d.name}, nous avons reçu une demande de réinitialisation de votre mot de passe du panneau Ekoru. Ouvrez ce lien pour en choisir un nouveau : ${d.url} (expire dans ${d.expiresIn}, une seule utilisation). Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.`,
    },
  },
};

function render(locale: MailLocale, data: AdminAccessData) {
  const t = COPY[data.kind][locale];
  // Built by this service, but a misconfigured panel URL must never turn the
  // CTA into a `javascript:` link.
  const url = safeUrl(data.url) ?? '#';
  const loginUrl = safeUrl(data.loginUrl) ?? '#';

  return {
    subject: t.subject(data),
    text: t.text(data),
    html: buildHtml(
      `
      ${header(t.tagline)}
      <div class="body">
        <h2>${escapeHtml(t.heading(data.name))}</h2>
        <p>${escapeHtml(t.lead(data))}</p>
        <p><strong>${escapeHtml(t.emailLine(data.email))}</strong></p>
        <div class="cta">
          <a href="${url}">${escapeHtml(t.cta)}</a>
        </div>
        <p>${escapeHtml(t.expiry(data.expiresIn))}</p>
        <div class="divider"></div>
        <p>${escapeHtml(t.fallback)}<br /><a href="${url}">${url}</a></p>
        <p>${escapeHtml(t.loginLine)}<br /><a href="${loginUrl}">${loginUrl}</a></p>
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

export const adminAccessTemplates: TemplateMap<AdminAccessData> = {
  es: (data) => render('es', data),
  en: (data) => render('en', data),
  fr: (data) => render('fr', data),
};
