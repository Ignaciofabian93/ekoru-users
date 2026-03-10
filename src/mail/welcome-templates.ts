interface WelcomeTemplateData {
  name: string;
}

type TemplateMap = Record<
  string,
  (data: WelcomeTemplateData) => { subject: string; html: string; text: string }
>;

const BASE_STYLES = `
  body { margin: 0; padding: 0; background-color: #f4f7f4; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; }
  .wrapper { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
  .header { background-color: #2d7a4f; padding: 40px 40px 32px; text-align: center; }
  .header h1 { margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px; }
  .header p { margin: 6px 0 0; color: #a8d5b8; font-size: 14px; }
  .body { padding: 40px; color: #333333; }
  .body h2 { margin: 0 0 16px; font-size: 22px; color: #1a1a1a; }
  .body p { margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #555555; }
  .cta { text-align: center; margin: 32px 0 24px; }
  .cta a { background-color: #2d7a4f; color: #ffffff; text-decoration: none; padding: 14px 36px; border-radius: 6px; font-size: 15px; font-weight: 600; display: inline-block; }
  .divider { height: 1px; background: #e8e8e8; margin: 24px 0; }
  .footer { padding: 24px 40px; background: #f9f9f9; text-align: center; }
  .footer p { margin: 0; font-size: 12px; color: #999999; line-height: 1.6; }
  .footer a { color: #2d7a4f; text-decoration: none; }
`;

function buildHtml(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>${BASE_STYLES}</style>
</head>
<body>
  <div class="wrapper">
    ${content}
  </div>
</body>
</html>`;
}

export const welcomeTemplates: TemplateMap = {
  es: ({ name }) => ({
    subject: '¡Bienvenido/a a Ekoru!',
    text: `Hola ${name}, ¡Bienvenido/a a Ekoru! Gracias por unirte a nuestra comunidad. Estás dando un gran paso hacia un consumo más consciente y sostenible. ¡Empieza a explorar ya en ekoru.cl!`,
    html: buildHtml(`
      <div class="header">
        <h1>Ekoru</h1>
        <p>Comercio consciente y sostenible</p>
      </div>
      <div class="body">
        <h2>¡Hola, ${name}! 👋</h2>
        <p>Nos alegra mucho que te hayas unido a <strong>Ekoru</strong>. Eres parte de una comunidad que cree que comprar y vender puede ser un acto de cuidado hacia el planeta.</p>
        <p>En Ekoru encontrarás productos y servicios de vendedores comprometidos con el comercio justo, la economía circular y la sostenibilidad.</p>
        <div class="cta">
          <a href="https://app.ekoru.cl">Comenzar a explorar</a>
        </div>
        <div class="divider"></div>
        <p>Si tienes alguna pregunta, escríbenos a <a href="mailto:contacto@ekoru.cl">contacto@ekoru.cl</a>. Estamos aquí para ayudarte.</p>
      </div>
      <div class="footer">
        <p>© ${new Date().getFullYear()} Ekoru · <a href="https://ekoru.cl">ekoru.cl</a></p>
        <p>Este correo fue enviado porque te registraste en Ekoru.</p>
      </div>
    `),
  }),

  en: ({ name }) => ({
    subject: 'Welcome to Ekoru!',
    text: `Hi ${name}, Welcome to Ekoru! Thank you for joining our community. You're taking a great step toward more conscious and sustainable consumption. Start exploring at ekoru.cl!`,
    html: buildHtml(`
      <div class="header">
        <h1>Ekoru</h1>
        <p>Conscious & sustainable commerce</p>
      </div>
      <div class="body">
        <h2>Hi, ${name}! 👋</h2>
        <p>We're thrilled to have you join <strong>Ekoru</strong>. You're now part of a community that believes buying and selling can be an act of care for our planet.</p>
        <p>On Ekoru you'll discover products and services from sellers committed to fair trade, the circular economy, and sustainability.</p>
        <div class="cta">
          <a href="https://app.ekoru.cl">Start exploring</a>
        </div>
        <div class="divider"></div>
        <p>Got a question? Reach us at <a href="mailto:contacto@ekoru.cl">contacto@ekoru.cl</a>. We're happy to help.</p>
      </div>
      <div class="footer">
        <p>© ${new Date().getFullYear()} Ekoru · <a href="https://ekoru.cl">ekoru.cl</a></p>
        <p>You received this email because you signed up for Ekoru.</p>
      </div>
    `),
  }),

  fr: ({ name }) => ({
    subject: 'Bienvenue sur Ekoru !',
    text: `Bonjour ${name}, Bienvenue sur Ekoru ! Merci de rejoindre notre communauté. Vous faites un grand pas vers une consommation plus consciente et durable. Commencez à explorer sur ekoru.cl !`,
    html: buildHtml(`
      <div class="header">
        <h1>Ekoru</h1>
        <p>Commerce conscient & durable</p>
      </div>
      <div class="body">
        <h2>Bonjour, ${name} ! 👋</h2>
        <p>Nous sommes ravis de vous accueillir sur <strong>Ekoru</strong>. Vous faites désormais partie d'une communauté qui croit qu'acheter et vendre peut être un acte de soin envers notre planète.</p>
        <p>Sur Ekoru, vous découvrirez des produits et services de vendeurs engagés dans le commerce équitable, l'économie circulaire et le développement durable.</p>
        <div class="cta">
          <a href="https://app.ekoru.cl">Commencer à explorer</a>
        </div>
        <div class="divider"></div>
        <p>Une question ? Contactez-nous à <a href="mailto:contacto@ekoru.cl">contacto@ekoru.cl</a>. Nous sommes là pour vous aider.</p>
      </div>
      <div class="footer">
        <p>© ${new Date().getFullYear()} Ekoru · <a href="https://ekoru.cl">ekoru.cl</a></p>
        <p>Vous avez reçu cet e-mail parce que vous vous êtes inscrit(e) sur Ekoru.</p>
      </div>
    `),
  }),
};
