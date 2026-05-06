import { Language } from '../graphql/enums';

export type SubscriptionMessages = {
  unauthorized: string;
  membershipNotFound: string;
  profileNotFound: string;
  errorGetMemberships: string;
  errorGetMembership: string;
  errorCreateMembership: string;
  errorUpsertTranslation: string;
  errorUpsertPricing: string;
  errorAssignMembership: string;
};

export const subscriptionMessages: Record<Language, SubscriptionMessages> = {
  [Language.ES]: {
    unauthorized: 'No autorizado',
    membershipNotFound: 'Membresía no encontrada',
    profileNotFound: 'Perfil no encontrado',
    errorGetMemberships: 'Error al obtener membresías',
    errorGetMembership: 'Error al obtener membresía',
    errorCreateMembership: 'Error al crear membresía',
    errorUpsertTranslation: 'Error al guardar traducción de membresía',
    errorUpsertPricing: 'Error al guardar precio de membresía',
    errorAssignMembership: 'Error al asignar membresía',
  },
  [Language.EN]: {
    unauthorized: 'Unauthorized',
    membershipNotFound: 'Membership not found',
    profileNotFound: 'Profile not found',
    errorGetMemberships: 'Error fetching memberships',
    errorGetMembership: 'Error fetching membership',
    errorCreateMembership: 'Error creating membership',
    errorUpsertTranslation: 'Error saving membership translation',
    errorUpsertPricing: 'Error saving membership pricing',
    errorAssignMembership: 'Error assigning membership',
  },
  [Language.FR]: {
    unauthorized: 'Non autorisé',
    membershipNotFound: 'Abonnement non trouvé',
    profileNotFound: 'Profil non trouvé',
    errorGetMemberships: 'Erreur lors de la récupération des abonnements',
    errorGetMembership: "Erreur lors de la récupération de l'abonnement",
    errorCreateMembership: "Erreur lors de la création de l'abonnement",
    errorUpsertTranslation: 'Erreur lors de la sauvegarde de la traduction',
    errorUpsertPricing: 'Erreur lors de la sauvegarde du prix',
    errorAssignMembership: "Erreur lors de l'attribution de l'abonnement",
  },
  [Language.PT]: {
    unauthorized: 'Não autorizado',
    membershipNotFound: 'Assinatura não encontrada',
    profileNotFound: 'Perfil não encontrado',
    errorGetMemberships: 'Erro ao obter assinaturas',
    errorGetMembership: 'Erro ao obter assinatura',
    errorCreateMembership: 'Erro ao criar assinatura',
    errorUpsertTranslation: 'Erro ao salvar tradução da assinatura',
    errorUpsertPricing: 'Erro ao salvar preço da assinatura',
    errorAssignMembership: 'Erro ao atribuir assinatura',
  },
  [Language.DE]: {
    unauthorized: 'Nicht autorisiert',
    membershipNotFound: 'Mitgliedschaft nicht gefunden',
    profileNotFound: 'Profil nicht gefunden',
    errorGetMemberships: 'Fehler beim Abrufen der Mitgliedschaften',
    errorGetMembership: 'Fehler beim Abrufen der Mitgliedschaft',
    errorCreateMembership: 'Fehler beim Erstellen der Mitgliedschaft',
    errorUpsertTranslation: 'Fehler beim Speichern der Übersetzung',
    errorUpsertPricing: 'Fehler beim Speichern des Preises',
    errorAssignMembership: 'Fehler beim Zuweisen der Mitgliedschaft',
  },
};
