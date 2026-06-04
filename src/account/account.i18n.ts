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
  // Seller labels
  labelNotFound: string;
  labelNameExists: string;
  labelInUse: string;
  labelTranslationNotFound: string;
  errorGetLabels: string;
  errorGetLabel: string;
  errorCreateLabel: string;
  errorUpdateLabel: string;
  errorDeleteLabel: string;
  errorUpsertLabelTranslation: string;
  errorDeleteLabelTranslation: string;
  // Seller levels
  levelNotFound: string;
  levelNameExists: string;
  levelPointsExists: string;
  levelInUse: string;
  levelTranslationNotFound: string;
  errorGetLevels: string;
  errorGetLevel: string;
  errorCreateLevel: string;
  errorUpdateLevel: string;
  errorDeleteLevel: string;
  errorUpsertLevelTranslation: string;
  errorDeleteLevelTranslation: string;
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
    labelNotFound: 'Etiqueta no encontrada',
    labelNameExists: 'Ya existe una etiqueta con ese nombre',
    labelInUse:
      'No se puede eliminar la etiqueta porque ya fue obtenida por vendedores',
    labelTranslationNotFound: 'Traducción de etiqueta no encontrada',
    errorGetLabels: 'Error al obtener etiquetas',
    errorGetLabel: 'Error al obtener etiqueta',
    errorCreateLabel: 'Error al crear etiqueta',
    errorUpdateLabel: 'Error al actualizar etiqueta',
    errorDeleteLabel: 'Error al eliminar etiqueta',
    errorUpsertLabelTranslation: 'Error al guardar traducción de etiqueta',
    errorDeleteLabelTranslation: 'Error al eliminar traducción de etiqueta',
    levelNotFound: 'Nivel no encontrado',
    levelNameExists: 'Ya existe un nivel con ese nombre',
    levelPointsExists: 'Ya existe un nivel con esos puntos mínimos',
    levelInUse:
      'No se puede eliminar el nivel porque está asignado a vendedores',
    levelTranslationNotFound: 'Traducción de nivel no encontrada',
    errorGetLevels: 'Error al obtener niveles',
    errorGetLevel: 'Error al obtener nivel',
    errorCreateLevel: 'Error al crear nivel',
    errorUpdateLevel: 'Error al actualizar nivel',
    errorDeleteLevel: 'Error al eliminar nivel',
    errorUpsertLevelTranslation: 'Error al guardar traducción de nivel',
    errorDeleteLevelTranslation: 'Error al eliminar traducción de nivel',
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
    labelNotFound: 'Label not found',
    labelNameExists: 'A label with this name already exists',
    labelInUse:
      'Cannot delete the label because it has already been earned by sellers',
    labelTranslationNotFound: 'Label translation not found',
    errorGetLabels: 'Error fetching labels',
    errorGetLabel: 'Error fetching label',
    errorCreateLabel: 'Error creating label',
    errorUpdateLabel: 'Error updating label',
    errorDeleteLabel: 'Error deleting label',
    errorUpsertLabelTranslation: 'Error saving label translation',
    errorDeleteLabelTranslation: 'Error deleting label translation',
    levelNotFound: 'Level not found',
    levelNameExists: 'A level with this name already exists',
    levelPointsExists: 'A level with these minimum points already exists',
    levelInUse: 'Cannot delete the level because it is assigned to sellers',
    levelTranslationNotFound: 'Level translation not found',
    errorGetLevels: 'Error fetching levels',
    errorGetLevel: 'Error fetching level',
    errorCreateLevel: 'Error creating level',
    errorUpdateLevel: 'Error updating level',
    errorDeleteLevel: 'Error deleting level',
    errorUpsertLevelTranslation: 'Error saving level translation',
    errorDeleteLevelTranslation: 'Error deleting level translation',
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
    labelNotFound: 'Label non trouvé',
    labelNameExists: 'Un label avec ce nom existe déjà',
    labelInUse:
      'Impossible de supprimer le label car il a déjà été obtenu par des vendeurs',
    labelTranslationNotFound: 'Traduction du label non trouvée',
    errorGetLabels: 'Erreur lors de la récupération des labels',
    errorGetLabel: 'Erreur lors de la récupération du label',
    errorCreateLabel: 'Erreur lors de la création du label',
    errorUpdateLabel: 'Erreur lors de la mise à jour du label',
    errorDeleteLabel: 'Erreur lors de la suppression du label',
    errorUpsertLabelTranslation:
      'Erreur lors de la sauvegarde de la traduction du label',
    errorDeleteLabelTranslation:
      'Erreur lors de la suppression de la traduction du label',
    levelNotFound: 'Niveau non trouvé',
    levelNameExists: 'Un niveau avec ce nom existe déjà',
    levelPointsExists: 'Un niveau avec ces points minimums existe déjà',
    levelInUse:
      'Impossible de supprimer le niveau car il est attribué à des vendeurs',
    levelTranslationNotFound: 'Traduction du niveau non trouvée',
    errorGetLevels: 'Erreur lors de la récupération des niveaux',
    errorGetLevel: 'Erreur lors de la récupération du niveau',
    errorCreateLevel: 'Erreur lors de la création du niveau',
    errorUpdateLevel: 'Erreur lors de la mise à jour du niveau',
    errorDeleteLevel: 'Erreur lors de la suppression du niveau',
    errorUpsertLevelTranslation:
      'Erreur lors de la sauvegarde de la traduction du niveau',
    errorDeleteLevelTranslation:
      'Erreur lors de la suppression de la traduction du niveau',
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
    labelNotFound: 'Etiqueta não encontrada',
    labelNameExists: 'Já existe uma etiqueta com esse nome',
    labelInUse:
      'Não é possível excluir a etiqueta porque já foi obtida por vendedores',
    labelTranslationNotFound: 'Tradução da etiqueta não encontrada',
    errorGetLabels: 'Erro ao obter etiquetas',
    errorGetLabel: 'Erro ao obter etiqueta',
    errorCreateLabel: 'Erro ao criar etiqueta',
    errorUpdateLabel: 'Erro ao atualizar etiqueta',
    errorDeleteLabel: 'Erro ao excluir etiqueta',
    errorUpsertLabelTranslation: 'Erro ao salvar tradução da etiqueta',
    errorDeleteLabelTranslation: 'Erro ao excluir tradução da etiqueta',
    levelNotFound: 'Nível não encontrado',
    levelNameExists: 'Já existe um nível com esse nome',
    levelPointsExists: 'Já existe um nível com esses pontos mínimos',
    levelInUse:
      'Não é possível excluir o nível porque está atribuído a vendedores',
    levelTranslationNotFound: 'Tradução do nível não encontrada',
    errorGetLevels: 'Erro ao obter níveis',
    errorGetLevel: 'Erro ao obter nível',
    errorCreateLevel: 'Erro ao criar nível',
    errorUpdateLevel: 'Erro ao atualizar nível',
    errorDeleteLevel: 'Erro ao excluir nível',
    errorUpsertLevelTranslation: 'Erro ao salvar tradução do nível',
    errorDeleteLevelTranslation: 'Erro ao excluir tradução do nível',
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
    labelNotFound: 'Label nicht gefunden',
    labelNameExists: 'Ein Label mit diesem Namen existiert bereits',
    labelInUse:
      'Das Label kann nicht gelöscht werden, da es bereits von Verkäufern erreicht wurde',
    labelTranslationNotFound: 'Label-Übersetzung nicht gefunden',
    errorGetLabels: 'Fehler beim Abrufen der Labels',
    errorGetLabel: 'Fehler beim Abrufen des Labels',
    errorCreateLabel: 'Fehler beim Erstellen des Labels',
    errorUpdateLabel: 'Fehler beim Aktualisieren des Labels',
    errorDeleteLabel: 'Fehler beim Löschen des Labels',
    errorUpsertLabelTranslation: 'Fehler beim Speichern der Label-Übersetzung',
    errorDeleteLabelTranslation: 'Fehler beim Löschen der Label-Übersetzung',
    levelNotFound: 'Stufe nicht gefunden',
    levelNameExists: 'Eine Stufe mit diesem Namen existiert bereits',
    levelPointsExists: 'Eine Stufe mit diesen Mindestpunkten existiert bereits',
    levelInUse:
      'Die Stufe kann nicht gelöscht werden, da sie Verkäufern zugewiesen ist',
    levelTranslationNotFound: 'Stufen-Übersetzung nicht gefunden',
    errorGetLevels: 'Fehler beim Abrufen der Stufen',
    errorGetLevel: 'Fehler beim Abrufen der Stufe',
    errorCreateLevel: 'Fehler beim Erstellen der Stufe',
    errorUpdateLevel: 'Fehler beim Aktualisieren der Stufe',
    errorDeleteLevel: 'Fehler beim Löschen der Stufe',
    errorUpsertLevelTranslation: 'Fehler beim Speichern der Stufen-Übersetzung',
    errorDeleteLevelTranslation: 'Fehler beim Löschen der Stufen-Übersetzung',
  },
};
