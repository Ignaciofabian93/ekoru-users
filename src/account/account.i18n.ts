import { Language } from '../graphql/enums';

export type AccountMessages = {
  unauthorized: string;
  incorrectPassword: string;
  errorDeactivateAccount: string;
  errorReactivateAccount: string;
  errorAddPoints: string;
  errorDeductPoints: string;
  errorUpdateSellerCategory: string;
  errorUpdatePassword: string;
};

export const accountMessages: Record<Language, AccountMessages> = {
  [Language.ES]: {
    unauthorized: 'No autorizado',
    incorrectPassword: 'La contraseña actual es incorrecta',
    errorDeactivateAccount: 'Error al desactivar cuenta',
    errorReactivateAccount: 'Error al activar cuenta',
    errorAddPoints: 'Error al incrementar puntos',
    errorDeductPoints: 'Error al reducir puntos',
    errorUpdateSellerCategory: 'Error al actualizar categoría del vendedor',
    errorUpdatePassword: 'Error al actualizar contraseña',
  },
  [Language.EN]: {
    unauthorized: 'Unauthorized',
    incorrectPassword: 'Current password is incorrect',
    errorDeactivateAccount: 'Error deactivating account',
    errorReactivateAccount: 'Error reactivating account',
    errorAddPoints: 'Error adding points',
    errorDeductPoints: 'Error deducting points',
    errorUpdateSellerCategory: 'Error updating seller category',
    errorUpdatePassword: 'Error updating password',
  },
  [Language.FR]: {
    unauthorized: 'Non autorisé',
    incorrectPassword: 'Le mot de passe actuel est incorrect',
    errorDeactivateAccount: 'Erreur lors de la désactivation du compte',
    errorReactivateAccount: 'Erreur lors de la réactivation du compte',
    errorAddPoints: "Erreur lors de l'ajout de points",
    errorDeductPoints: 'Erreur lors de la déduction de points',
    errorUpdateSellerCategory:
      'Erreur lors de la mise à jour de la catégorie du vendeur',
    errorUpdatePassword: 'Erreur lors de la mise à jour du mot de passe',
  },
  [Language.PT]: {
    unauthorized: 'Não autorizado',
    incorrectPassword: 'A senha atual está incorreta',
    errorDeactivateAccount: 'Erro ao desativar conta',
    errorReactivateAccount: 'Erro ao reativar conta',
    errorAddPoints: 'Erro ao adicionar pontos',
    errorDeductPoints: 'Erro ao deduzir pontos',
    errorUpdateSellerCategory: 'Erro ao atualizar categoria do vendedor',
    errorUpdatePassword: 'Erro ao atualizar senha',
  },
  [Language.DE]: {
    unauthorized: 'Nicht autorisiert',
    incorrectPassword: 'Das aktuelle Passwort ist falsch',
    errorDeactivateAccount: 'Fehler beim Deaktivieren des Kontos',
    errorReactivateAccount: 'Fehler beim Reaktivieren des Kontos',
    errorAddPoints: 'Fehler beim Hinzufügen von Punkten',
    errorDeductPoints: 'Fehler beim Abziehen von Punkten',
    errorUpdateSellerCategory:
      'Fehler beim Aktualisieren der Verkäuferkategorie',
    errorUpdatePassword: 'Fehler beim Aktualisieren des Passworts',
  },
};
