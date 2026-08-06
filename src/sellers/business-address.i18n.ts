import { Language } from '../graphql/enums';

export type BusinessAddressMessages = {
  unauthorized: string;
  businessProfileNotFound: string;
  addressNotFound: string;
  errorManage: string;
};

export const businessAddressMessages: Record<
  Language,
  BusinessAddressMessages
> = {
  [Language.ES]: {
    unauthorized: 'No autorizado',
    businessProfileNotFound: 'Perfil de negocio no encontrado',
    addressNotFound: 'Dirección no encontrada',
    errorManage: 'Error al gestionar la dirección del negocio',
  },
  [Language.EN]: {
    unauthorized: 'Unauthorized',
    businessProfileNotFound: 'Business profile not found',
    addressNotFound: 'Address not found',
    errorManage: 'Error managing the business address',
  },
  [Language.FR]: {
    unauthorized: 'Non autorisé',
    businessProfileNotFound: "Profil d'entreprise introuvable",
    addressNotFound: 'Adresse introuvable',
    errorManage: "Erreur lors de la gestion de l'adresse de l'entreprise",
  },
  [Language.PT]: {
    unauthorized: 'Não autorizado',
    businessProfileNotFound: 'Perfil de negócio não encontrado',
    addressNotFound: 'Endereço não encontrado',
    errorManage: 'Erro ao gerenciar o endereço do negócio',
  },
  [Language.DE]: {
    unauthorized: 'Nicht autorisiert',
    businessProfileNotFound: 'Geschäftsprofil nicht gefunden',
    addressNotFound: 'Adresse nicht gefunden',
    errorManage: 'Fehler beim Verwalten der Geschäftsadresse',
  },
};
