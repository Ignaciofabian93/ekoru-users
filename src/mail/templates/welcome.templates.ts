import {
  APP_BASE_URL,
  SUPPORT_EMAIL,
  buildHtml,
  escapeHtml,
  footer,
  header,
  type TemplateMap,
} from './layout';

export interface WelcomeData {
  name: string;
}

export const welcomeTemplates: TemplateMap<WelcomeData> = {
  es: ({ name }) => ({
    subject: '¡Bienvenido/a a Ekoru!',
    text: `Hola ${name}, ¡Bienvenido/a a Ekoru! Gracias por unirte a nuestra comunidad. Estás dando un gran paso hacia un consumo más consciente y sostenible. ¡Empieza a explorar ya en ekoru.cl!`,
    html: buildHtml(
      `
      ${header('Comercio consciente y sostenible')}
      <div class="body">
        <h2>¡Hola, ${escapeHtml(name)}! 👋</h2>
        <p>Nos alegra mucho que te hayas unido a <strong>Ekoru</strong>. Eres parte de una comunidad que cree que comprar y vender puede ser un acto de cuidado hacia el planeta.</p>
        <p>En Ekoru encontrarás productos y servicios de vendedores comprometidos con el comercio justo, la economía circular y la sostenibilidad.</p>
        <div class="cta">
          <a href="${APP_BASE_URL}">Comenzar a explorar</a>
        </div>
        <div class="divider"></div>
        <p>Si tienes alguna pregunta, escríbenos a <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>. Estamos aquí para ayudarte.</p>
      </div>
      ${footer('Este correo fue enviado porque te registraste en Ekoru.')}
    `,
      'es',
    ),
  }),

  en: ({ name }) => ({
    subject: 'Welcome to Ekoru!',
    text: `Hi ${name}, Welcome to Ekoru! Thank you for joining our community. You're taking a great step toward more conscious and sustainable consumption. Start exploring at ekoru.cl!`,
    html: buildHtml(
      `
      ${header('Conscious & sustainable commerce')}
      <div class="body">
        <h2>Hi, ${escapeHtml(name)}! 👋</h2>
        <p>We're thrilled to have you join <strong>Ekoru</strong>. You're now part of a community that believes buying and selling can be an act of care for our planet.</p>
        <p>On Ekoru you'll discover products and services from sellers committed to fair trade, the circular economy, and sustainability.</p>
        <div class="cta">
          <a href="${APP_BASE_URL}">Start exploring</a>
        </div>
        <div class="divider"></div>
        <p>Got a question? Reach us at <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>. We're happy to help.</p>
      </div>
      ${footer('You received this email because you signed up for Ekoru.')}
    `,
      'en',
    ),
  }),

  fr: ({ name }) => ({
    subject: 'Bienvenue sur Ekoru !',
    text: `Bonjour ${name}, Bienvenue sur Ekoru ! Merci de rejoindre notre communauté. Vous faites un grand pas vers une consommation plus consciente et durable. Commencez à explorer sur ekoru.cl !`,
    html: buildHtml(
      `
      ${header('Commerce conscient & durable')}
      <div class="body">
        <h2>Bonjour, ${escapeHtml(name)} ! 👋</h2>
        <p>Nous sommes ravis de vous accueillir sur <strong>Ekoru</strong>. Vous faites désormais partie d'une communauté qui croit qu'acheter et vendre peut être un acte de soin envers notre planète.</p>
        <p>Sur Ekoru, vous découvrirez des produits et services de vendeurs engagés dans le commerce équitable, l'économie circulaire et le développement durable.</p>
        <div class="cta">
          <a href="${APP_BASE_URL}">Commencer à explorer</a>
        </div>
        <div class="divider"></div>
        <p>Une question ? Contactez-nous à <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>. Nous sommes là pour vous aider.</p>
      </div>
      ${footer('Vous avez reçu cet e-mail parce que vous vous êtes inscrit(e) sur Ekoru.')}
    `,
      'fr',
    ),
  }),
};
