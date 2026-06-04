import { Language } from '../graphql/enums';

export type LocationMessages = {
  unauthorized: string;
  forbiddenNotPlatformAdmin: string;
  noCountries: string;
  noRegions: string;
  noCities: string;
  noCounties: string;
  invalidCountryId: string;
  invalidRegionId: string;
  invalidCityId: string;
  countryNotFound: string;
  regionNotFound: string;
  cityNotFound: string;
  countyNotFound: string;
  countryInUse: string;
  regionInUse: string;
  cityInUse: string;
  countyInUse: string;
  errorCountries: string;
  errorRegions: string;
  errorCities: string;
  errorCounties: string;
  errorCreateCountry: string;
  errorCreateRegion: string;
  errorCreateCity: string;
  errorCreateCounty: string;
  errorUpdateCountry: string;
  errorUpdateRegion: string;
  errorUpdateCity: string;
  errorUpdateCounty: string;
  errorDeleteCountry: string;
  errorDeleteRegion: string;
  errorDeleteCity: string;
  errorDeleteCounty: string;
};

export const locationMessages: Record<Language, LocationMessages> = {
  [Language.ES]: {
    unauthorized: 'No autorizado',
    forbiddenNotPlatformAdmin:
      'Solo los administradores de plataforma pueden realizar esta acción',
    noCountries: 'No hay países disponibles',
    noRegions: 'No hay regiones disponibles',
    noCities: 'No hay ciudades disponibles',
    noCounties: 'No hay comunas disponibles',
    invalidCountryId: 'No se proporcionó un ID de país válido',
    invalidRegionId: 'No se proporcionó un ID de región válido',
    invalidCityId: 'No se proporcionó un ID de ciudad válido',
    countryNotFound: 'País no encontrado',
    regionNotFound: 'Región no encontrada',
    cityNotFound: 'Ciudad no encontrada',
    countyNotFound: 'Comuna no encontrada',
    countryInUse:
      'No se puede eliminar el país porque tiene regiones o registros asociados',
    regionInUse:
      'No se puede eliminar la región porque tiene ciudades o registros asociados',
    cityInUse:
      'No se puede eliminar la ciudad porque tiene comunas o registros asociados',
    countyInUse:
      'No se puede eliminar la comuna porque tiene registros asociados',
    errorCountries: 'Error al obtener los países',
    errorRegions: 'Error al obtener las regiones',
    errorCities: 'Error al obtener las ciudades',
    errorCounties: 'Error al obtener las comunas',
    errorCreateCountry: 'Error al crear el país',
    errorCreateRegion: 'Error al crear la región',
    errorCreateCity: 'Error al crear la ciudad',
    errorCreateCounty: 'Error al crear la comuna',
    errorUpdateCountry: 'Error al actualizar el país',
    errorUpdateRegion: 'Error al actualizar la región',
    errorUpdateCity: 'Error al actualizar la ciudad',
    errorUpdateCounty: 'Error al actualizar la comuna',
    errorDeleteCountry: 'Error al eliminar el país',
    errorDeleteRegion: 'Error al eliminar la región',
    errorDeleteCity: 'Error al eliminar la ciudad',
    errorDeleteCounty: 'Error al eliminar la comuna',
  },
  [Language.EN]: {
    unauthorized: 'Unauthorized',
    forbiddenNotPlatformAdmin: 'Only platform admins can perform this action',
    noCountries: 'No countries available',
    noRegions: 'No regions available',
    noCities: 'No cities available',
    noCounties: 'No counties available',
    invalidCountryId: 'No valid country ID was provided',
    invalidRegionId: 'No valid region ID was provided',
    invalidCityId: 'No valid city ID was provided',
    countryNotFound: 'Country not found',
    regionNotFound: 'Region not found',
    cityNotFound: 'City not found',
    countyNotFound: 'County not found',
    countryInUse:
      'Cannot delete the country because it has associated regions or records',
    regionInUse:
      'Cannot delete the region because it has associated cities or records',
    cityInUse:
      'Cannot delete the city because it has associated counties or records',
    countyInUse: 'Cannot delete the county because it has associated records',
    errorCountries: 'Error fetching countries',
    errorRegions: 'Error fetching regions',
    errorCities: 'Error fetching cities',
    errorCounties: 'Error fetching counties',
    errorCreateCountry: 'Error creating country',
    errorCreateRegion: 'Error creating region',
    errorCreateCity: 'Error creating city',
    errorCreateCounty: 'Error creating county',
    errorUpdateCountry: 'Error updating country',
    errorUpdateRegion: 'Error updating region',
    errorUpdateCity: 'Error updating city',
    errorUpdateCounty: 'Error updating county',
    errorDeleteCountry: 'Error deleting country',
    errorDeleteRegion: 'Error deleting region',
    errorDeleteCity: 'Error deleting city',
    errorDeleteCounty: 'Error deleting county',
  },
  [Language.FR]: {
    unauthorized: 'Non autorisé',
    forbiddenNotPlatformAdmin:
      'Seuls les administrateurs de plateforme peuvent effectuer cette action',
    noCountries: 'Aucun pays disponible',
    noRegions: 'Aucune région disponible',
    noCities: 'Aucune ville disponible',
    noCounties: 'Aucune commune disponible',
    invalidCountryId: "Aucun ID de pays valide n'a été fourni",
    invalidRegionId: "Aucun ID de région valide n'a été fourni",
    invalidCityId: "Aucun ID de ville valide n'a été fourni",
    countryNotFound: 'Pays introuvable',
    regionNotFound: 'Région introuvable',
    cityNotFound: 'Ville introuvable',
    countyNotFound: 'Commune introuvable',
    countryInUse:
      'Impossible de supprimer le pays car il a des régions ou des enregistrements associés',
    regionInUse:
      'Impossible de supprimer la région car elle a des villes ou des enregistrements associés',
    cityInUse:
      'Impossible de supprimer la ville car elle a des communes ou des enregistrements associés',
    countyInUse:
      'Impossible de supprimer la commune car elle a des enregistrements associés',
    errorCountries: 'Erreur lors de la récupération des pays',
    errorRegions: 'Erreur lors de la récupération des régions',
    errorCities: 'Erreur lors de la récupération des villes',
    errorCounties: 'Erreur lors de la récupération des communes',
    errorCreateCountry: 'Erreur lors de la création du pays',
    errorCreateRegion: 'Erreur lors de la création de la région',
    errorCreateCity: 'Erreur lors de la création de la ville',
    errorCreateCounty: 'Erreur lors de la création de la commune',
    errorUpdateCountry: 'Erreur lors de la mise à jour du pays',
    errorUpdateRegion: 'Erreur lors de la mise à jour de la région',
    errorUpdateCity: 'Erreur lors de la mise à jour de la ville',
    errorUpdateCounty: 'Erreur lors de la mise à jour de la commune',
    errorDeleteCountry: 'Erreur lors de la suppression du pays',
    errorDeleteRegion: 'Erreur lors de la suppression de la région',
    errorDeleteCity: 'Erreur lors de la suppression de la ville',
    errorDeleteCounty: 'Erreur lors de la suppression de la commune',
  },
  [Language.PT]: {
    unauthorized: 'Não autorizado',
    forbiddenNotPlatformAdmin:
      'Apenas administradores de plataforma podem realizar esta ação',
    noCountries: 'Nenhum país disponível',
    noRegions: 'Nenhuma região disponível',
    noCities: 'Nenhuma cidade disponível',
    noCounties: 'Nenhum município disponível',
    invalidCountryId: 'Nenhum ID de país válido foi fornecido',
    invalidRegionId: 'Nenhum ID de região válido foi fornecido',
    invalidCityId: 'Nenhum ID de cidade válido foi fornecido',
    countryNotFound: 'País não encontrado',
    regionNotFound: 'Região não encontrada',
    cityNotFound: 'Cidade não encontrada',
    countyNotFound: 'Município não encontrado',
    countryInUse:
      'Não é possível excluir o país porque possui regiões ou registros associados',
    regionInUse:
      'Não é possível excluir a região porque possui cidades ou registros associados',
    cityInUse:
      'Não é possível excluir a cidade porque possui municípios ou registros associados',
    countyInUse:
      'Não é possível excluir o município porque possui registros associados',
    errorCountries: 'Erro ao obter os países',
    errorRegions: 'Erro ao obter as regiões',
    errorCities: 'Erro ao obter as cidades',
    errorCounties: 'Erro ao obter os municípios',
    errorCreateCountry: 'Erro ao criar o país',
    errorCreateRegion: 'Erro ao criar a região',
    errorCreateCity: 'Erro ao criar a cidade',
    errorCreateCounty: 'Erro ao criar o município',
    errorUpdateCountry: 'Erro ao atualizar o país',
    errorUpdateRegion: 'Erro ao atualizar a região',
    errorUpdateCity: 'Erro ao atualizar a cidade',
    errorUpdateCounty: 'Erro ao atualizar o município',
    errorDeleteCountry: 'Erro ao excluir o país',
    errorDeleteRegion: 'Erro ao excluir a região',
    errorDeleteCity: 'Erro ao excluir a cidade',
    errorDeleteCounty: 'Erro ao excluir o município',
  },
  [Language.DE]: {
    unauthorized: 'Nicht autorisiert',
    forbiddenNotPlatformAdmin:
      'Nur Plattform-Administratoren können diese Aktion durchführen',
    noCountries: 'Keine Länder verfügbar',
    noRegions: 'Keine Regionen verfügbar',
    noCities: 'Keine Städte verfügbar',
    noCounties: 'Keine Gemeinden verfügbar',
    invalidCountryId: 'Es wurde keine gültige Länder-ID angegeben',
    invalidRegionId: 'Es wurde keine gültige Regions-ID angegeben',
    invalidCityId: 'Es wurde keine gültige Stadt-ID angegeben',
    countryNotFound: 'Land nicht gefunden',
    regionNotFound: 'Region nicht gefunden',
    cityNotFound: 'Stadt nicht gefunden',
    countyNotFound: 'Gemeinde nicht gefunden',
    countryInUse:
      'Das Land kann nicht gelöscht werden, da ihm Regionen oder Datensätze zugeordnet sind',
    regionInUse:
      'Die Region kann nicht gelöscht werden, da ihr Städte oder Datensätze zugeordnet sind',
    cityInUse:
      'Die Stadt kann nicht gelöscht werden, da ihr Gemeinden oder Datensätze zugeordnet sind',
    countyInUse:
      'Die Gemeinde kann nicht gelöscht werden, da ihr Datensätze zugeordnet sind',
    errorCountries: 'Fehler beim Abrufen der Länder',
    errorRegions: 'Fehler beim Abrufen der Regionen',
    errorCities: 'Fehler beim Abrufen der Städte',
    errorCounties: 'Fehler beim Abrufen der Gemeinden',
    errorCreateCountry: 'Fehler beim Erstellen des Landes',
    errorCreateRegion: 'Fehler beim Erstellen der Region',
    errorCreateCity: 'Fehler beim Erstellen der Stadt',
    errorCreateCounty: 'Fehler beim Erstellen der Gemeinde',
    errorUpdateCountry: 'Fehler beim Aktualisieren des Landes',
    errorUpdateRegion: 'Fehler beim Aktualisieren der Region',
    errorUpdateCity: 'Fehler beim Aktualisieren der Stadt',
    errorUpdateCounty: 'Fehler beim Aktualisieren der Gemeinde',
    errorDeleteCountry: 'Fehler beim Löschen des Landes',
    errorDeleteRegion: 'Fehler beim Löschen der Region',
    errorDeleteCity: 'Fehler beim Löschen der Stadt',
    errorDeleteCounty: 'Fehler beim Löschen der Gemeinde',
  },
};
