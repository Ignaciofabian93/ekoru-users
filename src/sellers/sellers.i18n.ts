import { Language } from '../graphql/enums';

export type SellerMessages = {
  unauthorized: string;
  emailAlreadyExists: string;
  errorGetSellers: string;
  errorGetSellerById: string;
  errorGetMe: string;
  errorGetSellerLevels: string;
  errorGetSellerLevel: string;
  errorRegisterPerson: string;
  errorRegisterBusiness: string;
  errorUpdateSeller: string;
  errorUpdatePersonProfile: string;
  errorUpdateBusinessProfile: string;
  errorUpdatePreferences: string;
};

export const sellerMessages: Record<Language, SellerMessages> = {
  [Language.ES]: {
    unauthorized: 'No autorizado',
    emailAlreadyExists: 'Ya existe un usuario con este email',
    errorGetSellers: 'Error al obtener usuarios',
    errorGetSellerById: 'Error al obtener usuario por ID',
    errorGetMe: 'Error al obtener usuario actual',
    errorGetSellerLevels: 'Error al obtener niveles de vendedor',
    errorGetSellerLevel: 'Error al obtener nivel de vendedor',
    errorRegisterPerson: 'Error al registrar persona',
    errorRegisterBusiness: 'Error al registrar negocio',
    errorUpdateSeller: 'Error al actualizar usuario',
    errorUpdatePersonProfile: 'Error al actualizar perfil de persona',
    errorUpdateBusinessProfile: 'Error al actualizar perfil de tienda',
    errorUpdatePreferences: 'Error al actualizar preferencias',
  },
  [Language.EN]: {
    unauthorized: 'Unauthorized',
    emailAlreadyExists: 'A user with this email already exists',
    errorGetSellers: 'Error fetching sellers',
    errorGetSellerById: 'Error fetching seller by ID',
    errorGetMe: 'Error fetching current user',
    errorGetSellerLevels: 'Error fetching seller levels',
    errorGetSellerLevel: 'Error fetching seller level',
    errorRegisterPerson: 'Error registering person',
    errorRegisterBusiness: 'Error registering business',
    errorUpdateSeller: 'Error updating seller',
    errorUpdatePersonProfile: 'Error updating person profile',
    errorUpdateBusinessProfile: 'Error updating business profile',
    errorUpdatePreferences: 'Error updating preferences',
  },
  [Language.FR]: {
    unauthorized: 'Non autorisé',
    emailAlreadyExists: 'Un utilisateur avec cet email existe déjà',
    errorGetSellers: 'Erreur lors de la récupération des vendeurs',
    errorGetSellerById: 'Erreur lors de la récupération du vendeur par ID',
    errorGetMe: "Erreur lors de la récupération de l'utilisateur actuel",
    errorGetSellerLevels:
      'Erreur lors de la récupération des niveaux de vendeur',
    errorGetSellerLevel: 'Erreur lors de la récupération du niveau de vendeur',
    errorRegisterPerson: "Erreur lors de l'enregistrement de la personne",
    errorRegisterBusiness: "Erreur lors de l'enregistrement de l'entreprise",
    errorUpdateSeller: 'Erreur lors de la mise à jour du vendeur',
    errorUpdatePersonProfile:
      'Erreur lors de la mise à jour du profil personnel',
    errorUpdateBusinessProfile:
      "Erreur lors de la mise à jour du profil d'entreprise",
    errorUpdatePreferences: 'Erreur lors de la mise à jour des préférences',
  },
  [Language.PT]: {
    unauthorized: 'Não autorizado',
    emailAlreadyExists: 'Já existe um usuário com este email',
    errorGetSellers: 'Erro ao obter vendedores',
    errorGetSellerById: 'Erro ao obter vendedor por ID',
    errorGetMe: 'Erro ao obter usuário atual',
    errorGetSellerLevels: 'Erro ao obter níveis de vendedor',
    errorGetSellerLevel: 'Erro ao obter nível de vendedor',
    errorRegisterPerson: 'Erro ao registrar pessoa',
    errorRegisterBusiness: 'Erro ao registrar negócio',
    errorUpdateSeller: 'Erro ao atualizar vendedor',
    errorUpdatePersonProfile: 'Erro ao atualizar perfil pessoal',
    errorUpdateBusinessProfile: 'Erro ao atualizar perfil de negócio',
    errorUpdatePreferences: 'Erro ao atualizar preferências',
  },
  [Language.DE]: {
    unauthorized: 'Nicht autorisiert',
    emailAlreadyExists: 'Ein Benutzer mit dieser E-Mail existiert bereits',
    errorGetSellers: 'Fehler beim Abrufen der Verkäufer',
    errorGetSellerById: 'Fehler beim Abrufen des Verkäufers anhand der ID',
    errorGetMe: 'Fehler beim Abrufen des aktuellen Benutzers',
    errorGetSellerLevels: 'Fehler beim Abrufen der Verkäuferstufen',
    errorGetSellerLevel: 'Fehler beim Abrufen der Verkäuferstufe',
    errorRegisterPerson: 'Fehler bei der Registrierung der Person',
    errorRegisterBusiness: 'Fehler bei der Registrierung des Unternehmens',
    errorUpdateSeller: 'Fehler beim Aktualisieren des Verkäufers',
    errorUpdatePersonProfile:
      'Fehler beim Aktualisieren des persönlichen Profils',
    errorUpdateBusinessProfile:
      'Fehler beim Aktualisieren des Geschäftsprofils',
    errorUpdatePreferences: 'Fehler beim Aktualisieren der Einstellungen',
  },
};
