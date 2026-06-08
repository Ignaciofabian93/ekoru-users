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
  sellerNotFound: string;
  forbidden: string;
  errorVerifySeller: string;
  errorBanSeller: string;
  errorReinstateSeller: string;
  sellerAlreadyBanned: string;
  sellerNotBanned: string;
  sellerHasPendingObligations: string;
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
    sellerNotFound: 'Usuario no encontrado',
    forbidden: 'No tienes permisos para realizar esta acción',
    errorVerifySeller: 'Error al verificar usuario',
    errorBanSeller: 'Error al bloquear usuario',
    errorReinstateSeller: 'Error al reactivar usuario',
    sellerAlreadyBanned: 'El usuario ya está bloqueado',
    sellerNotBanned: 'El usuario no tiene un bloqueo activo',
    sellerHasPendingObligations:
      'No se puede bloquear: el usuario tiene operaciones pendientes (pedidos, pagos, reembolsos, cotizaciones, reservas o intercambios). Resuélvelas antes de bloquear.',
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
    sellerNotFound: 'Seller not found',
    forbidden: 'You do not have permission to perform this action',
    errorVerifySeller: 'Error verifying seller',
    errorBanSeller: 'Error banning seller',
    errorReinstateSeller: 'Error reinstating seller',
    sellerAlreadyBanned: 'The seller is already banned',
    sellerNotBanned: 'The seller does not have an active ban',
    sellerHasPendingObligations:
      'Cannot ban: the seller has pending activity (orders, payments, refunds, quotations, bookings or exchanges). Resolve them before banning.',
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
    sellerNotFound: 'Vendeur introuvable',
    forbidden: "Vous n'avez pas la permission d'effectuer cette action",
    errorVerifySeller: 'Erreur lors de la vérification du vendeur',
    errorBanSeller: 'Erreur lors du bannissement du vendeur',
    errorReinstateSeller: 'Erreur lors de la réintégration du vendeur',
    sellerAlreadyBanned: 'Le vendeur est déjà banni',
    sellerNotBanned: "Le vendeur n'a pas de bannissement actif",
    sellerHasPendingObligations:
      'Bannissement impossible : le vendeur a des activités en cours (commandes, paiements, remboursements, devis, réservations ou échanges). Résolvez-les avant de bannir.',
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
    sellerNotFound: 'Vendedor não encontrado',
    forbidden: 'Você não tem permissão para realizar esta ação',
    errorVerifySeller: 'Erro ao verificar vendedor',
    errorBanSeller: 'Erro ao banir vendedor',
    errorReinstateSeller: 'Erro ao reativar vendedor',
    sellerAlreadyBanned: 'O vendedor já está banido',
    sellerNotBanned: 'O vendedor não tem um banimento ativo',
    sellerHasPendingObligations:
      'Não é possível banir: o vendedor tem atividades pendentes (pedidos, pagamentos, reembolsos, orçamentos, reservas ou trocas). Resolva-as antes de banir.',
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
    sellerNotFound: 'Verkäufer nicht gefunden',
    forbidden: 'Sie haben keine Berechtigung, diese Aktion auszuführen',
    errorVerifySeller: 'Fehler beim Verifizieren des Verkäufers',
    errorBanSeller: 'Fehler beim Sperren des Verkäufers',
    errorReinstateSeller: 'Fehler beim Reaktivieren des Verkäufers',
    sellerAlreadyBanned: 'Der Verkäufer ist bereits gesperrt',
    sellerNotBanned: 'Der Verkäufer hat keine aktive Sperre',
    sellerHasPendingObligations:
      'Sperren nicht möglich: Der Verkäufer hat offene Vorgänge (Bestellungen, Zahlungen, Rückerstattungen, Angebote, Buchungen oder Tauschgeschäfte). Lösen Sie diese vor dem Sperren.',
  },
};
