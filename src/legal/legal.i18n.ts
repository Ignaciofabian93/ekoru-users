import { Language } from '../graphql/enums';

export type LegalMessages = {
  signInRequired: string;
  adminUnauthorized: string;
  forbidden: string;
  /** The version sent is not the one in force (it changed while the page was open). */
  termsChanged: string;
  noTermsInForce: string;
  versionNotFound: string;
  publishedIsFinal: string;
  draftAlreadyOpen: (version: number) => string;
  spanishRequired: string;
  duplicateLanguage: string;
  unusableContent: (language: string) => string;
  errorLoadTerms: string;
  errorAcceptTerms: string;
  errorSaveTerms: string;
};

export const legalMessages: Record<Language, LegalMessages> = {
  [Language.ES]: {
    signInRequired: 'Debes iniciar sesión',
    adminUnauthorized: 'Se requiere una sesión de administrador',
    forbidden: 'No tienes permiso para editar los Términos y Políticas',
    termsChanged:
      'Los Términos y Políticas se actualizaron. Recarga la página y acéptalos de nuevo.',
    noTermsInForce: 'No hay Términos y Políticas vigentes',
    versionNotFound: 'Esa versión de los Términos no existe',
    publishedIsFinal:
      'Una versión publicada no se puede cambiar ni borrar; crea una nueva versión',
    draftAlreadyOpen: (v) =>
      `Ya hay un borrador abierto (versión ${v}); edítalo o bórralo antes de crear otro`,
    spanishRequired: 'El texto en español es obligatorio',
    duplicateLanguage: 'Hay dos textos en el mismo idioma',
    unusableContent: (l) =>
      `El texto en ${l} necesita al menos un título de cláusula: una línea que empiece con "## "`,
    errorLoadTerms: 'No pudimos cargar los Términos y Políticas',
    errorAcceptTerms: 'No pudimos registrar tu aceptación. Inténtalo de nuevo.',
    errorSaveTerms: 'No pudimos guardar los Términos y Políticas',
  },
  [Language.EN]: {
    signInRequired: 'You must sign in',
    adminUnauthorized: 'An admin session is required',
    forbidden: 'You are not allowed to edit the Terms and Policies',
    termsChanged:
      'The Terms and Policies were updated. Reload the page and accept them again.',
    noTermsInForce: 'No Terms and Policies are in force',
    versionNotFound: 'That version of the Terms does not exist',
    publishedIsFinal:
      'A published version cannot be changed or deleted; create a new version',
    draftAlreadyOpen: (v) =>
      `A draft is already open (version ${v}); edit or delete it before creating another`,
    spanishRequired: 'The Spanish text is required',
    duplicateLanguage: 'Two texts share the same language',
    unusableContent: (l) =>
      `The ${l} text needs at least one clause title: a line starting with "## "`,
    errorLoadTerms: 'We could not load the Terms and Policies',
    errorAcceptTerms: 'We could not record your acceptance. Please try again.',
    errorSaveTerms: 'We could not save the Terms and Policies',
  },
  [Language.FR]: {
    signInRequired: 'Vous devez vous connecter',
    adminUnauthorized: 'Une session administrateur est requise',
    forbidden:
      "Vous n'êtes pas autorisé à modifier les Conditions et Politiques",
    termsChanged:
      'Les Conditions et Politiques ont été mises à jour. Rechargez la page et acceptez-les à nouveau.',
    noTermsInForce: "Aucune Condition ni Politique n'est en vigueur",
    versionNotFound: "Cette version des Conditions n'existe pas",
    publishedIsFinal:
      'Une version publiée ne peut être ni modifiée ni supprimée ; créez une nouvelle version',
    draftAlreadyOpen: (v) =>
      `Un brouillon est déjà ouvert (version ${v}) ; modifiez-le ou supprimez-le avant d'en créer un autre`,
    spanishRequired: 'Le texte en espagnol est obligatoire',
    duplicateLanguage: 'Deux textes ont la même langue',
    unusableContent: (l) =>
      `Le texte en ${l} doit contenir au moins un titre de clause : une ligne commençant par "## "`,
    errorLoadTerms: "Nous n'avons pas pu charger les Conditions et Politiques",
    errorAcceptTerms:
      "Nous n'avons pas pu enregistrer votre acceptation. Veuillez réessayer.",
    errorSaveTerms:
      "Nous n'avons pas pu enregistrer les Conditions et Politiques",
  },
  [Language.PT]: {
    signInRequired: 'Você precisa entrar',
    adminUnauthorized: 'É necessária uma sessão de administrador',
    forbidden: 'Você não tem permissão para editar os Termos e Políticas',
    termsChanged:
      'Os Termos e Políticas foram atualizados. Recarregue a página e aceite-os novamente.',
    noTermsInForce: 'Não há Termos e Políticas em vigor',
    versionNotFound: 'Essa versão dos Termos não existe',
    publishedIsFinal:
      'Uma versão publicada não pode ser alterada nem excluída; crie uma nova versão',
    draftAlreadyOpen: (v) =>
      `Já existe um rascunho aberto (versão ${v}); edite-o ou exclua-o antes de criar outro`,
    spanishRequired: 'O texto em espanhol é obrigatório',
    duplicateLanguage: 'Dois textos têm o mesmo idioma',
    unusableContent: (l) =>
      `O texto em ${l} precisa de pelo menos um título de cláusula: uma linha que comece com "## "`,
    errorLoadTerms: 'Não foi possível carregar os Termos e Políticas',
    errorAcceptTerms:
      'Não foi possível registrar sua aceitação. Tente novamente.',
    errorSaveTerms: 'Não foi possível salvar os Termos e Políticas',
  },
  [Language.DE]: {
    signInRequired: 'Du musst dich anmelden',
    adminUnauthorized: 'Eine Admin-Sitzung ist erforderlich',
    forbidden: 'Du darfst die Bedingungen und Richtlinien nicht bearbeiten',
    termsChanged:
      'Die Bedingungen und Richtlinien wurden aktualisiert. Lade die Seite neu und akzeptiere sie erneut.',
    noTermsInForce: 'Es sind keine Bedingungen und Richtlinien in Kraft',
    versionNotFound: 'Diese Version der Bedingungen existiert nicht',
    publishedIsFinal:
      'Eine veröffentlichte Version kann nicht geändert oder gelöscht werden; erstelle eine neue Version',
    draftAlreadyOpen: (v) =>
      `Es gibt bereits einen offenen Entwurf (Version ${v}); bearbeite oder lösche ihn zuerst`,
    spanishRequired: 'Der spanische Text ist erforderlich',
    duplicateLanguage: 'Zwei Texte haben dieselbe Sprache',
    unusableContent: (l) =>
      `Der Text auf ${l} braucht mindestens einen Klauseltitel: eine Zeile, die mit "## " beginnt`,
    errorLoadTerms:
      'Die Bedingungen und Richtlinien konnten nicht geladen werden',
    errorAcceptTerms:
      'Deine Zustimmung konnte nicht gespeichert werden. Bitte versuche es erneut.',
    errorSaveTerms:
      'Die Bedingungen und Richtlinien konnten nicht gespeichert werden',
  },
};
