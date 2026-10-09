import {
  APP_BASE_URL,
  SUPPORT_EMAIL,
  buildHtml,
  escapeHtml,
  footer,
  formatDateTime,
  header,
  specTable,
  type RenderedMail,
  type TemplateMap,
} from './layout';

/**
 * Business onboarding review. A business signs up, EKORU reviews what it told
 * us (what it sells, materials, process), creates any missing category or
 * material, and approves or rejects the account. The business cannot sign in
 * until it is approved, so these emails are the only channel it has with us.
 */

export interface BusinessReviewData {
  businessName: string;
}

export interface BusinessRejectedData {
  businessName: string;
  reason: string;
}

/** Internal notice to EKORU's review inbox. Spanish only: it is for the team. */
export interface BusinessApplicationData {
  sellerId: string;
  businessName: string;
  email: string;
  sellerType: string;
  businessType: string;
  message: string;
  submittedAt: Date;
  reviewUrl: string;
  /**
   * Set when a rejected business re-applies (USR-5): why EKORU rejected the
   * previous application, so the reviewer can check what changed.
   */
  previousRejectionReason?: string | null;
}

/** Plain text keeps the business's line breaks; HTML needs them as <br>. */
const paragraphs = (value: string) =>
  escapeHtml(value).replace(/\r?\n/g, '<br />');

// ─── To the business: application received ──────────────────────────────────

export const businessApplicationReceivedTemplates: TemplateMap<BusinessReviewData> =
  {
    es: ({ businessName }) => ({
      subject: 'Recibimos tu solicitud en Ekoru',
      text: `Hola ${businessName}, recibimos tu solicitud para vender en Ekoru. Nuestro equipo revisará la información de tu negocio y te escribiremos a este correo cuando tu cuenta esté aprobada. Hasta entonces no podrás iniciar sesión. Si quieres agregar algo, responde a ${SUPPORT_EMAIL}.`,
      html: buildHtml(
        `
      ${header('Comercio consciente y sostenible')}
      <div class="body">
        <span class="badge progress">En revisión</span>
        <h2>¡Gracias, ${escapeHtml(businessName)}!</h2>
        <p>Recibimos tu solicitud para vender en <strong>Ekoru</strong>. Nuestro equipo revisará la información de tu negocio, los productos que ofreces y los materiales que usas.</p>
        <p>Te escribiremos a este correo cuando tu cuenta esté aprobada. Hasta entonces no podrás iniciar sesión: así nos aseguramos de que todo lo publicado en Ekoru sea realmente sostenible.</p>
        <div class="divider"></div>
        <p>¿Quieres agregar algo a tu solicitud? Escríbenos a <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>
      </div>
      ${footer('Este correo fue enviado porque registraste un negocio en Ekoru.')}
    `,
        'es',
      ),
    }),

    en: ({ businessName }) => ({
      subject: 'We received your Ekoru application',
      text: `Hi ${businessName}, we received your application to sell on Ekoru. Our team will review your business details and email you here once your account is approved. Until then you won't be able to sign in. To add anything, write to ${SUPPORT_EMAIL}.`,
      html: buildHtml(
        `
      ${header('Conscious & sustainable commerce')}
      <div class="body">
        <span class="badge progress">Under review</span>
        <h2>Thank you, ${escapeHtml(businessName)}!</h2>
        <p>We received your application to sell on <strong>Ekoru</strong>. Our team will review your business details, the products you offer and the materials you use.</p>
        <p>We'll email you here once your account is approved. Until then you won't be able to sign in: that's how we make sure everything on Ekoru is genuinely sustainable.</p>
        <div class="divider"></div>
        <p>Want to add something to your application? Write to <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>
      </div>
      ${footer('You received this email because you registered a business on Ekoru.')}
    `,
        'en',
      ),
    }),

    fr: ({ businessName }) => ({
      subject: 'Nous avons reçu votre demande Ekoru',
      text: `Bonjour ${businessName}, nous avons reçu votre demande pour vendre sur Ekoru. Notre équipe va examiner les informations de votre entreprise et vous écrira à cette adresse une fois votre compte approuvé. D'ici là, vous ne pourrez pas vous connecter. Pour ajouter quelque chose, écrivez à ${SUPPORT_EMAIL}.`,
      html: buildHtml(
        `
      ${header('Commerce conscient & durable')}
      <div class="body">
        <span class="badge progress">En cours d'examen</span>
        <h2>Merci, ${escapeHtml(businessName)} !</h2>
        <p>Nous avons reçu votre demande pour vendre sur <strong>Ekoru</strong>. Notre équipe va examiner les informations de votre entreprise, les produits que vous proposez et les matériaux que vous utilisez.</p>
        <p>Nous vous écrirons à cette adresse une fois votre compte approuvé. D'ici là, vous ne pourrez pas vous connecter : c'est ainsi que nous garantissons que tout ce qui est publié sur Ekoru est réellement durable.</p>
        <div class="divider"></div>
        <p>Vous souhaitez compléter votre demande ? Écrivez-nous à <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>
      </div>
      ${footer('Vous avez reçu cet e-mail parce que vous avez inscrit une entreprise sur Ekoru.')}
    `,
        'fr',
      ),
    }),
  };

// ─── To the business: approved ──────────────────────────────────────────────

export const businessApprovedTemplates: TemplateMap<BusinessReviewData> = {
  es: ({ businessName }) => ({
    subject: '¡Tu cuenta de Ekoru fue aprobada!',
    text: `Hola ${businessName}, revisamos tu solicitud y tu cuenta de Ekoru está aprobada. Ya puedes iniciar sesión y publicar tus productos o servicios: ${APP_BASE_URL}/es/login`,
    html: buildHtml(
      `
      ${header('Comercio consciente y sostenible')}
      <div class="body">
        <span class="badge success">Aprobada</span>
        <h2>¡Bienvenido/a, ${escapeHtml(businessName)}! 🌱</h2>
        <p>Revisamos tu solicitud y tu cuenta de <strong>Ekoru</strong> está aprobada. Ya puedes iniciar sesión y publicar tus productos o servicios.</p>
        <p>Al publicar, indica de qué materiales está hecho cada producto: con esa información calculamos su impacto ambiental.</p>
        <div class="cta">
          <a href="${APP_BASE_URL}/es/login">Iniciar sesión</a>
        </div>
        <div class="divider"></div>
        <p>Si tienes alguna pregunta, escríbenos a <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>
      </div>
      ${footer('Este correo fue enviado porque registraste un negocio en Ekoru.')}
    `,
      'es',
    ),
  }),

  en: ({ businessName }) => ({
    subject: 'Your Ekoru account is approved!',
    text: `Hi ${businessName}, we reviewed your application and your Ekoru account is approved. You can now sign in and publish your products or services: ${APP_BASE_URL}/en/login`,
    html: buildHtml(
      `
      ${header('Conscious & sustainable commerce')}
      <div class="body">
        <span class="badge success">Approved</span>
        <h2>Welcome, ${escapeHtml(businessName)}! 🌱</h2>
        <p>We reviewed your application and your <strong>Ekoru</strong> account is approved. You can now sign in and publish your products or services.</p>
        <p>When you publish, list the materials each product is made of: that's how we calculate its environmental impact.</p>
        <div class="cta">
          <a href="${APP_BASE_URL}/en/login">Sign in</a>
        </div>
        <div class="divider"></div>
        <p>Got a question? Reach us at <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>
      </div>
      ${footer('You received this email because you registered a business on Ekoru.')}
    `,
      'en',
    ),
  }),

  fr: ({ businessName }) => ({
    subject: 'Votre compte Ekoru est approuvé !',
    text: `Bonjour ${businessName}, nous avons examiné votre demande et votre compte Ekoru est approuvé. Vous pouvez maintenant vous connecter et publier vos produits ou services : ${APP_BASE_URL}/fr/login`,
    html: buildHtml(
      `
      ${header('Commerce conscient & durable')}
      <div class="body">
        <span class="badge success">Approuvé</span>
        <h2>Bienvenue, ${escapeHtml(businessName)} ! 🌱</h2>
        <p>Nous avons examiné votre demande et votre compte <strong>Ekoru</strong> est approuvé. Vous pouvez maintenant vous connecter et publier vos produits ou services.</p>
        <p>Lors de la publication, indiquez les matériaux de chaque produit : c'est ainsi que nous calculons son impact environnemental.</p>
        <div class="cta">
          <a href="${APP_BASE_URL}/fr/login">Se connecter</a>
        </div>
        <div class="divider"></div>
        <p>Une question ? Contactez-nous à <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>
      </div>
      ${footer('Vous avez reçu cet e-mail parce que vous avez inscrit une entreprise sur Ekoru.')}
    `,
      'fr',
    ),
  }),
};

// ─── To the business: rejected ──────────────────────────────────────────────

export const businessRejectedTemplates: TemplateMap<BusinessRejectedData> = {
  es: ({ businessName, reason }) => ({
    subject: 'Sobre tu solicitud en Ekoru',
    text: `Hola ${businessName}, revisamos tu solicitud para vender en Ekoru y por ahora no podemos aprobarla. Motivo: ${reason}. Cuando lo hayas resuelto, puedes volver a postular aquí: ${APP_BASE_URL}/es/reapply. Si quieres aclarar algo, escríbenos a ${SUPPORT_EMAIL}.`,
    html: buildHtml(
      `
      ${header('Comercio consciente y sostenible')}
      <div class="body">
        <span class="badge danger">No aprobada</span>
        <h2>Hola, ${escapeHtml(businessName)}</h2>
        <p>Gracias por tu interés en <strong>Ekoru</strong>. Revisamos tu solicitud y por ahora no podemos aprobarla, por el siguiente motivo:</p>
        <div class="notice"><p>${paragraphs(reason)}</p></div>
        <p>Cuando lo hayas resuelto, puedes enviarnos una nueva solicitud con tu correo y contraseña. La revisaremos de nuevo.</p>
        <div class="cta">
          <a href="${APP_BASE_URL}/es/reapply">Volver a postular</a>
        </div>
        <p>Si quieres aclarar algo, escríbenos a <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>
      </div>
      ${footer('Este correo fue enviado porque registraste un negocio en Ekoru.')}
    `,
      'es',
    ),
  }),

  en: ({ businessName, reason }) => ({
    subject: 'About your Ekoru application',
    text: `Hi ${businessName}, we reviewed your application to sell on Ekoru and can't approve it for now. Reason: ${reason}. Once it's sorted, you can apply again here: ${APP_BASE_URL}/en/reapply. To clarify anything, write to ${SUPPORT_EMAIL}.`,
    html: buildHtml(
      `
      ${header('Conscious & sustainable commerce')}
      <div class="body">
        <span class="badge danger">Not approved</span>
        <h2>Hi, ${escapeHtml(businessName)}</h2>
        <p>Thank you for your interest in <strong>Ekoru</strong>. We reviewed your application and can't approve it for now, for the following reason:</p>
        <div class="notice"><p>${paragraphs(reason)}</p></div>
        <p>Once it's sorted, you can send us a new application with your email and password, and we'll review it again.</p>
        <div class="cta">
          <a href="${APP_BASE_URL}/en/reapply">Apply again</a>
        </div>
        <p>To clarify anything, write to <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>
      </div>
      ${footer('You received this email because you registered a business on Ekoru.')}
    `,
      'en',
    ),
  }),

  fr: ({ businessName, reason }) => ({
    subject: 'À propos de votre demande Ekoru',
    text: `Bonjour ${businessName}, nous avons examiné votre demande pour vendre sur Ekoru et ne pouvons pas l'approuver pour le moment. Motif : ${reason}. Une fois le problème résolu, vous pouvez postuler à nouveau ici : ${APP_BASE_URL}/fr/reapply. Pour toute précision, écrivez à ${SUPPORT_EMAIL}.`,
    html: buildHtml(
      `
      ${header('Commerce conscient & durable')}
      <div class="body">
        <span class="badge danger">Non approuvée</span>
        <h2>Bonjour, ${escapeHtml(businessName)}</h2>
        <p>Merci de votre intérêt pour <strong>Ekoru</strong>. Nous avons examiné votre demande et ne pouvons pas l'approuver pour le moment, pour la raison suivante :</p>
        <div class="notice"><p>${paragraphs(reason)}</p></div>
        <p>Une fois le problème résolu, vous pouvez nous envoyer une nouvelle demande avec votre e-mail et votre mot de passe. Nous l'examinerons à nouveau.</p>
        <div class="cta">
          <a href="${APP_BASE_URL}/fr/reapply">Postuler à nouveau</a>
        </div>
        <p>Pour toute précision, écrivez-nous à <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>
      </div>
      ${footer('Vous avez reçu cet e-mail parce que vous avez inscrit une entreprise sur Ekoru.')}
    `,
      'fr',
    ),
  }),
};

// ─── To EKORU: a new application to review ──────────────────────────────────

export function businessApplicationReviewMail(
  data: BusinessApplicationData,
): RenderedMail {
  const submitted = formatDateTime(data.submittedAt, 'es');
  const previous = data.previousRejectionReason?.trim() || null;
  const resubmitted = data.previousRejectionReason !== undefined;
  return {
    subject: resubmitted
      ? `Solicitud reenviada tras rechazo: ${data.businessName}`
      : `Nueva solicitud de negocio: ${data.businessName}`,
    text: [
      resubmitted
        ? `Un negocio rechazado volvió a postular en Ekoru`
        : `Nueva solicitud de negocio en Ekoru`,
      ``,
      ...(previous ? [`Motivo del rechazo anterior: ${previous}`, ``] : []),
      `Negocio: ${data.businessName}`,
      `Email: ${data.email}`,
      `Tipo de cuenta: ${data.sellerType}`,
      `Tipo de negocio: ${data.businessType}`,
      `Enviada: ${submitted}`,
      `ID: ${data.sellerId}`,
      ``,
      `Mensaje:`,
      data.message,
      ``,
      `Revisar y aprobar: ${data.reviewUrl}`,
    ].join('\n'),
    html: buildHtml(
      `
      ${header('Revisión de negocios')}
      <div class="body">
        <span class="badge progress">${resubmitted ? 'Reenviada tras rechazo' : 'Pendiente de revisión'}</span>
        <h2>${escapeHtml(data.businessName)}</h2>
        ${
          previous
            ? `<div class="notice"><p class="label">Motivo del rechazo anterior</p><p>${paragraphs(previous)}</p></div>`
            : ''
        }
        ${specTable([
          ['Email', data.email],
          ['Tipo de cuenta', data.sellerType],
          ['Tipo de negocio', data.businessType],
          ['Enviada', submitted],
          ['ID', data.sellerId],
        ])}
        <div class="card">
          <p class="label">Mensaje del negocio</p>
          <p>${paragraphs(data.message)}</p>
        </div>
        <p>Antes de aprobar, crea en el panel las categorías o materiales que falten. Responder a este correo le escribe directamente al negocio.</p>
        <div class="cta">
          <a href="${escapeHtml(data.reviewUrl)}">Revisar en el panel</a>
        </div>
      </div>
      ${footer('Correo interno: un negocio se registró en Ekoru y espera aprobación.')}
    `,
      'es',
    ),
  };
}
