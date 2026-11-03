import { Language } from '../graphql/enums';

/** Messages for the panel's password links and the business Team screen (USR-15). */
export type TeamMessages = {
  unauthorized: string;
  notBusinessAdmin: string;
  forbiddenTeam: string;
  memberNotFound: string;
  cannotChangeOwner: string;
  cannotChangeSelf: string;
  invalidRole: string;
  invalidPermissions: string;
  invalidToken: string;
  expiredToken: string;
  weakPassword: string;
  errorTeam: string;
  errorSetPassword: string;
  errorRequestReset: string;
};

export const teamMessages: Record<Language, TeamMessages> = {
  [Language.ES]: {
    unauthorized: 'No autorizado',
    notBusinessAdmin: 'Esta sección es para las cuentas de un negocio',
    forbiddenTeam:
      'Solo el dueño del negocio, o quien tenga el permiso de equipo, puede manejar las cuentas del panel',
    memberNotFound: 'Esa cuenta no es parte de tu equipo',
    cannotChangeOwner: 'La cuenta del dueño no se puede cambiar desde aquí',
    cannotChangeSelf: 'No puedes cambiar tu propia cuenta desde aquí',
    invalidRole:
      'Elige uno de los roles del equipo: encargado, analista o soporte',
    invalidPermissions: 'Solo puedes dar permisos del negocio que tú tengas',
    invalidToken:
      'Este enlace no es válido o ya se usó. Pide uno nuevo con "¿Olvidaste tu contraseña?"',
    expiredToken:
      'Este enlace caducó. Pide uno nuevo con "¿Olvidaste tu contraseña?"',
    weakPassword: 'La contraseña debe tener al menos 8 caracteres',
    errorTeam: 'Error al cargar el equipo',
    errorSetPassword: 'Error al guardar la contraseña',
    errorRequestReset: 'Error al pedir el enlace',
  },
  [Language.EN]: {
    unauthorized: 'Unauthorized',
    notBusinessAdmin: 'This section is for a business’s accounts',
    forbiddenTeam:
      'Only the business owner, or someone with the team permission, can manage panel accounts',
    memberNotFound: 'That account is not part of your team',
    cannotChangeOwner: 'The owner’s account cannot be changed here',
    cannotChangeSelf: 'You cannot change your own account here',
    invalidRole: 'Choose one of the team roles: manager, analyst or support',
    invalidPermissions: 'You can only give business permissions you hold',
    invalidToken:
      'This link is not valid or was already used. Ask for a new one with "Forgot your password?"',
    expiredToken:
      'This link has expired. Ask for a new one with "Forgot your password?"',
    weakPassword: 'The password must be at least 8 characters long',
    errorTeam: 'Error loading the team',
    errorSetPassword: 'Error saving the password',
    errorRequestReset: 'Error requesting the link',
  },
  [Language.FR]: {
    unauthorized: 'Non autorisé',
    notBusinessAdmin: 'Cette section est réservée aux comptes d’une entreprise',
    forbiddenTeam:
      'Seul le propriétaire de l’entreprise, ou quelqu’un avec la permission équipe, peut gérer les comptes du panneau',
    memberNotFound: 'Ce compte ne fait pas partie de votre équipe',
    cannotChangeOwner: 'Le compte du propriétaire ne peut pas être modifié ici',
    cannotChangeSelf: 'Vous ne pouvez pas modifier votre propre compte ici',
    invalidRole:
      'Choisissez un des rôles de l’équipe : responsable, analyste ou support',
    invalidPermissions:
      'Vous ne pouvez donner que les permissions d’entreprise que vous avez',
    invalidToken:
      'Ce lien n’est pas valide ou a déjà servi. Demandez-en un nouveau avec « Mot de passe oublié ? »',
    expiredToken:
      'Ce lien a expiré. Demandez-en un nouveau avec « Mot de passe oublié ? »',
    weakPassword: 'Le mot de passe doit contenir au moins 8 caractères',
    errorTeam: 'Erreur lors du chargement de l’équipe',
    errorSetPassword: 'Erreur lors de l’enregistrement du mot de passe',
    errorRequestReset: 'Erreur lors de la demande du lien',
  },
  [Language.PT]: {
    unauthorized: 'Não autorizado',
    notBusinessAdmin: 'Esta seção é para as contas de uma empresa',
    forbiddenTeam:
      'Somente o dono da empresa, ou quem tiver a permissão de equipe, pode gerenciar as contas do painel',
    memberNotFound: 'Essa conta não faz parte da sua equipe',
    cannotChangeOwner: 'A conta do dono não pode ser alterada aqui',
    cannotChangeSelf: 'Você não pode alterar a sua própria conta aqui',
    invalidRole:
      'Escolha um dos papéis da equipe: gerente, analista ou suporte',
    invalidPermissions: 'Você só pode dar permissões da empresa que você tem',
    invalidToken:
      'Este link não é válido ou já foi usado. Peça um novo com "Esqueceu sua senha?"',
    expiredToken: 'Este link expirou. Peça um novo com "Esqueceu sua senha?"',
    weakPassword: 'A senha deve ter pelo menos 8 caracteres',
    errorTeam: 'Erro ao carregar a equipe',
    errorSetPassword: 'Erro ao salvar a senha',
    errorRequestReset: 'Erro ao pedir o link',
  },
  [Language.DE]: {
    unauthorized: 'Nicht autorisiert',
    notBusinessAdmin: 'Dieser Bereich ist für die Konten eines Unternehmens',
    forbiddenTeam:
      'Nur der Inhaber des Unternehmens oder wer die Team-Berechtigung hat, kann Panel-Konten verwalten',
    memberNotFound: 'Dieses Konto gehört nicht zu Ihrem Team',
    cannotChangeOwner: 'Das Konto des Inhabers kann hier nicht geändert werden',
    cannotChangeSelf: 'Sie können Ihr eigenes Konto hier nicht ändern',
    invalidRole:
      'Wählen Sie eine der Team-Rollen: Manager, Analyst oder Support',
    invalidPermissions:
      'Sie können nur Unternehmensberechtigungen vergeben, die Sie selbst haben',
    invalidToken:
      'Dieser Link ist ungültig oder wurde bereits verwendet. Fordern Sie mit "Passwort vergessen?" einen neuen an',
    expiredToken:
      'Dieser Link ist abgelaufen. Fordern Sie mit "Passwort vergessen?" einen neuen an',
    weakPassword: 'Das Passwort muss mindestens 8 Zeichen lang sein',
    errorTeam: 'Fehler beim Laden des Teams',
    errorSetPassword: 'Fehler beim Speichern des Passworts',
    errorRequestReset: 'Fehler beim Anfordern des Links',
  },
};
