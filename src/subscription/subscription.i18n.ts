import { Language } from '../graphql/enums';

export type SubscriptionMessages = {
  unauthorized: string;
  /** Signed-in admin without the permission (FORBIDDEN). */
  forbidden: string;
  membershipNotFound: string;
  translationNotFound: string;
  pricingNotFound: string;
  profileNotFound: string;
  errorGetMemberships: string;
  errorGetMembership: string;
  errorCreateMembership: string;
  errorUpdateMembership: string;
  errorDeleteMembership: string;
  errorUpsertTranslation: string;
  errorDeleteTranslation: string;
  errorUpsertPricing: string;
  errorDeletePricing: string;
  errorAssignMembership: string;
  /** A seller tried to give themselves a paid plan without paying. */
  paidPlanNeedsCheckout: string;
  subscriptionNotFound: string;
  errorCancelSubscription: string;
};

export const subscriptionMessages: Record<Language, SubscriptionMessages> = {
  [Language.ES]: {
    unauthorized: 'No autorizado',
    forbidden: 'No tienes permisos para realizar esta acción',
    membershipNotFound: 'Membresía no encontrada',
    translationNotFound: 'Traducción de membresía no encontrada',
    pricingNotFound: 'Precio de membresía no encontrado',
    profileNotFound: 'Perfil no encontrado',
    errorGetMemberships: 'Error al obtener membresías',
    errorGetMembership: 'Error al obtener membresía',
    errorCreateMembership: 'Error al crear membresía',
    errorUpdateMembership: 'Error al actualizar membresía',
    errorDeleteMembership: 'Error al eliminar membresía',
    errorUpsertTranslation: 'Error al guardar traducción de membresía',
    errorDeleteTranslation: 'Error al eliminar traducción de membresía',
    errorUpsertPricing: 'Error al guardar precio de membresía',
    errorDeletePricing: 'Error al eliminar precio de membresía',
    errorAssignMembership: 'Error al asignar membresía',
    paidPlanNeedsCheckout: 'Los planes pagados se activan al completar el pago',
    subscriptionNotFound: 'Suscripción no encontrada',
    errorCancelSubscription: 'Error al cancelar la suscripción',
  },
  [Language.EN]: {
    unauthorized: 'Unauthorized',
    forbidden: 'You do not have permission to perform this action',
    membershipNotFound: 'Membership not found',
    translationNotFound: 'Membership translation not found',
    pricingNotFound: 'Membership pricing not found',
    profileNotFound: 'Profile not found',
    errorGetMemberships: 'Error fetching memberships',
    errorGetMembership: 'Error fetching membership',
    errorCreateMembership: 'Error creating membership',
    errorUpdateMembership: 'Error updating membership',
    errorDeleteMembership: 'Error deleting membership',
    errorUpsertTranslation: 'Error saving membership translation',
    errorDeleteTranslation: 'Error deleting membership translation',
    errorUpsertPricing: 'Error saving membership pricing',
    errorDeletePricing: 'Error deleting membership pricing',
    errorAssignMembership: 'Error assigning membership',
    paidPlanNeedsCheckout: 'Paid plans are activated by completing checkout',
    subscriptionNotFound: 'Subscription not found',
    errorCancelSubscription: 'Error cancelling the subscription',
  },
  [Language.FR]: {
    unauthorized: 'Non autorisé',
    forbidden: "Vous n'avez pas la permission d'effectuer cette action",
    membershipNotFound: 'Abonnement non trouvé',
    translationNotFound: "Traduction de l'abonnement non trouvée",
    pricingNotFound: "Prix de l'abonnement non trouvé",
    profileNotFound: 'Profil non trouvé',
    errorGetMemberships: 'Erreur lors de la récupération des abonnements',
    errorGetMembership: "Erreur lors de la récupération de l'abonnement",
    errorCreateMembership: "Erreur lors de la création de l'abonnement",
    errorUpdateMembership: "Erreur lors de la mise à jour de l'abonnement",
    errorDeleteMembership: "Erreur lors de la suppression de l'abonnement",
    errorUpsertTranslation: 'Erreur lors de la sauvegarde de la traduction',
    errorDeleteTranslation: 'Erreur lors de la suppression de la traduction',
    errorUpsertPricing: 'Erreur lors de la sauvegarde du prix',
    errorDeletePricing: 'Erreur lors de la suppression du prix',
    errorAssignMembership: "Erreur lors de l'attribution de l'abonnement",
    paidPlanNeedsCheckout:
      "Les forfaits payants s'activent une fois le paiement effectué",
    subscriptionNotFound: 'Abonnement introuvable',
    errorCancelSubscription: "Erreur lors de l'annulation de l'abonnement",
  },
  [Language.PT]: {
    unauthorized: 'Não autorizado',
    forbidden: 'Você não tem permissão para realizar esta ação',
    membershipNotFound: 'Assinatura não encontrada',
    translationNotFound: 'Tradução da assinatura não encontrada',
    pricingNotFound: 'Preço da assinatura não encontrado',
    profileNotFound: 'Perfil não encontrado',
    errorGetMemberships: 'Erro ao obter assinaturas',
    errorGetMembership: 'Erro ao obter assinatura',
    errorCreateMembership: 'Erro ao criar assinatura',
    errorUpdateMembership: 'Erro ao atualizar assinatura',
    errorDeleteMembership: 'Erro ao excluir assinatura',
    errorUpsertTranslation: 'Erro ao salvar tradução da assinatura',
    errorDeleteTranslation: 'Erro ao excluir tradução da assinatura',
    errorUpsertPricing: 'Erro ao salvar preço da assinatura',
    errorDeletePricing: 'Erro ao excluir preço da assinatura',
    errorAssignMembership: 'Erro ao atribuir assinatura',
    paidPlanNeedsCheckout:
      'Os planos pagos são ativados ao concluir o pagamento',
    subscriptionNotFound: 'Assinatura não encontrada',
    errorCancelSubscription: 'Erro ao cancelar a assinatura',
  },
  [Language.DE]: {
    unauthorized: 'Nicht autorisiert',
    forbidden: 'Sie haben keine Berechtigung, diese Aktion auszuführen',
    membershipNotFound: 'Mitgliedschaft nicht gefunden',
    translationNotFound: 'Übersetzung der Mitgliedschaft nicht gefunden',
    pricingNotFound: 'Preis der Mitgliedschaft nicht gefunden',
    profileNotFound: 'Profil nicht gefunden',
    errorGetMemberships: 'Fehler beim Abrufen der Mitgliedschaften',
    errorGetMembership: 'Fehler beim Abrufen der Mitgliedschaft',
    errorCreateMembership: 'Fehler beim Erstellen der Mitgliedschaft',
    errorUpdateMembership: 'Fehler beim Aktualisieren der Mitgliedschaft',
    errorDeleteMembership: 'Fehler beim Löschen der Mitgliedschaft',
    errorUpsertTranslation: 'Fehler beim Speichern der Übersetzung',
    errorDeleteTranslation: 'Fehler beim Löschen der Übersetzung',
    errorUpsertPricing: 'Fehler beim Speichern des Preises',
    errorDeletePricing: 'Fehler beim Löschen des Preises',
    errorAssignMembership: 'Fehler beim Zuweisen der Mitgliedschaft',
    paidPlanNeedsCheckout:
      'Kostenpflichtige Tarife werden nach Abschluss der Zahlung aktiviert',
    subscriptionNotFound: 'Abonnement nicht gefunden',
    errorCancelSubscription: 'Fehler beim Kündigen des Abonnements',
  },
};
