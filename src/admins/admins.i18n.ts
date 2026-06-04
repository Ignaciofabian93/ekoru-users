import { Language } from '../graphql/enums';

export type AdminMessages = {
  unauthorized: string;
  forbiddenManageAdmins: string;
  cannotDeactivateSelf: string;
  adminNotFound: string;
  emailAlreadyExists: string;
  businessIdRequired: string;
  errorGetAdmins: string;
  errorGetAdmin: string;
  errorGetMyData: string;
  errorCreateAdmin: string;
  errorUpdateAdmin: string;
  errorDeleteAdmin: string;
  errorToggleAdminStatus: string;
  errorAssignPermissions: string;
};

export const adminMessages: Record<Language, AdminMessages> = {
  [Language.ES]: {
    unauthorized: 'No autorizado',
    forbiddenManageAdmins:
      'Solo los administradores de plataforma con el permiso MANAGE_ADMINS pueden gestionar administradores',
    cannotDeactivateSelf: 'No puedes desactivar tu propia cuenta',
    adminNotFound: 'Administrador no encontrado',
    emailAlreadyExists: 'Ya existe un administrador con ese email',
    businessIdRequired:
      'El ID de negocio es requerido para administradores de negocio',
    errorGetAdmins: 'Error al obtener administradores',
    errorGetAdmin: 'Error al obtener administrador',
    errorGetMyData: 'Error al obtener datos del administrador',
    errorCreateAdmin: 'Error al crear administrador',
    errorUpdateAdmin: 'Error al actualizar administrador',
    errorDeleteAdmin: 'Error al eliminar administrador',
    errorToggleAdminStatus: 'Error al cambiar estado del administrador',
    errorAssignPermissions: 'Error al asignar permisos',
  },
  [Language.EN]: {
    unauthorized: 'Unauthorized',
    forbiddenManageAdmins:
      'Only platform admins with the MANAGE_ADMINS permission can manage admins',
    cannotDeactivateSelf: 'You cannot deactivate your own account',
    adminNotFound: 'Admin not found',
    emailAlreadyExists: 'An admin with this email already exists',
    businessIdRequired: 'Business ID is required for business administrators',
    errorGetAdmins: 'Error fetching admins',
    errorGetAdmin: 'Error fetching admin',
    errorGetMyData: 'Error fetching admin data',
    errorCreateAdmin: 'Error creating admin',
    errorUpdateAdmin: 'Error updating admin',
    errorDeleteAdmin: 'Error deleting admin',
    errorToggleAdminStatus: 'Error toggling admin status',
    errorAssignPermissions: 'Error assigning permissions',
  },
  [Language.FR]: {
    unauthorized: 'Non autorisé',
    forbiddenManageAdmins:
      'Seuls les administrateurs de plateforme disposant de la permission MANAGE_ADMINS peuvent gérer les administrateurs',
    cannotDeactivateSelf: 'Vous ne pouvez pas désactiver votre propre compte',
    adminNotFound: 'Administrateur non trouvé',
    emailAlreadyExists: 'Un administrateur avec cet email existe déjà',
    businessIdRequired:
      "L'ID d'entreprise est requis pour les administrateurs d'entreprise",
    errorGetAdmins: 'Erreur lors de la récupération des administrateurs',
    errorGetAdmin: "Erreur lors de la récupération de l'administrateur",
    errorGetMyData:
      "Erreur lors de la récupération des données de l'administrateur",
    errorCreateAdmin: "Erreur lors de la création de l'administrateur",
    errorUpdateAdmin: "Erreur lors de la mise à jour de l'administrateur",
    errorDeleteAdmin: "Erreur lors de la suppression de l'administrateur",
    errorToggleAdminStatus:
      "Erreur lors du changement de statut de l'administrateur",
    errorAssignPermissions: "Erreur lors de l'attribution des permissions",
  },
  [Language.PT]: {
    unauthorized: 'Não autorizado',
    forbiddenManageAdmins:
      'Apenas administradores de plataforma com a permissão MANAGE_ADMINS podem gerenciar administradores',
    cannotDeactivateSelf: 'Você não pode desativar a sua própria conta',
    adminNotFound: 'Administrador não encontrado',
    emailAlreadyExists: 'Já existe um administrador com esse email',
    businessIdRequired:
      'O ID de negócio é obrigatório para administradores de negócio',
    errorGetAdmins: 'Erro ao obter administradores',
    errorGetAdmin: 'Erro ao obter administrador',
    errorGetMyData: 'Erro ao obter dados do administrador',
    errorCreateAdmin: 'Erro ao criar administrador',
    errorUpdateAdmin: 'Erro ao atualizar administrador',
    errorDeleteAdmin: 'Erro ao excluir administrador',
    errorToggleAdminStatus: 'Erro ao alterar status do administrador',
    errorAssignPermissions: 'Erro ao atribuir permissões',
  },
  [Language.DE]: {
    unauthorized: 'Nicht autorisiert',
    forbiddenManageAdmins:
      'Nur Plattform-Administratoren mit der Berechtigung MANAGE_ADMINS können Administratoren verwalten',
    cannotDeactivateSelf: 'Sie können Ihr eigenes Konto nicht deaktivieren',
    adminNotFound: 'Administrator nicht gefunden',
    emailAlreadyExists: 'Ein Administrator mit dieser E-Mail existiert bereits',
    businessIdRequired:
      'Die Unternehmens-ID ist für Unternehmensadministratoren erforderlich',
    errorGetAdmins: 'Fehler beim Abrufen der Administratoren',
    errorGetAdmin: 'Fehler beim Abrufen des Administrators',
    errorGetMyData: 'Fehler beim Abrufen der Administratordaten',
    errorCreateAdmin: 'Fehler beim Erstellen des Administrators',
    errorUpdateAdmin: 'Fehler beim Aktualisieren des Administrators',
    errorDeleteAdmin: 'Fehler beim Löschen des Administrators',
    errorToggleAdminStatus: 'Fehler beim Ändern des Administratorstatus',
    errorAssignPermissions: 'Fehler beim Zuweisen der Berechtigungen',
  },
};
