import { Language } from '@prisma/client';

export type LocationMessages = {
  unauthorized: string;
  noCountries: string;
  noRegions: string;
  noCities: string;
  noCounties: string;
  invalidCountryId: string;
  invalidRegionId: string;
  invalidCityId: string;
  errorCountries: string;
  errorRegions: string;
  errorCities: string;
  errorCounties: string;
};

export const locationMessages: Record<Language, LocationMessages> = {
  [Language.ES]: {
    unauthorized: 'No autorizado',
    noCountries: 'No hay países disponibles',
    noRegions: 'No hay regiones disponibles',
    noCities: 'No hay ciudades disponibles',
    noCounties: 'No hay comunas disponibles',
    invalidCountryId: 'No se proporcionó un ID de país válido',
    invalidRegionId: 'No se proporcionó un ID de región válido',
    invalidCityId: 'No se proporcionó un ID de ciudad válido',
    errorCountries: 'Error al obtener los países',
    errorRegions: 'Error al obtener las regiones',
    errorCities: 'Error al obtener las ciudades',
    errorCounties: 'Error al obtener las comunas',
  },
  [Language.EN]: {
    unauthorized: 'Unauthorized',
    noCountries: 'No countries available',
    noRegions: 'No regions available',
    noCities: 'No cities available',
    noCounties: 'No counties available',
    invalidCountryId: 'No valid country ID was provided',
    invalidRegionId: 'No valid region ID was provided',
    invalidCityId: 'No valid city ID was provided',
    errorCountries: 'Error fetching countries',
    errorRegions: 'Error fetching regions',
    errorCities: 'Error fetching cities',
    errorCounties: 'Error fetching counties',
  },
  [Language.FR]: {
    unauthorized: 'Non autorisé',
    noCountries: 'Aucun pays disponible',
    noRegions: 'Aucune région disponible',
    noCities: 'Aucune ville disponible',
    noCounties: 'Aucune commune disponible',
    invalidCountryId: "Aucun ID de pays valide n'a été fourni",
    invalidRegionId: "Aucun ID de région valide n'a été fourni",
    invalidCityId: "Aucun ID de ville valide n'a été fourni",
    errorCountries: 'Erreur lors de la récupération des pays',
    errorRegions: 'Erreur lors de la récupération des régions',
    errorCities: 'Erreur lors de la récupération des villes',
    errorCounties: 'Erreur lors de la récupération des communes',
  },
  [Language.PT]: {
    unauthorized: 'Não autorizado',
    noCountries: 'Nenhum país disponível',
    noRegions: 'Nenhuma região disponível',
    noCities: 'Nenhuma cidade disponível',
    noCounties: 'Nenhum município disponível',
    invalidCountryId: 'Nenhum ID de país válido foi fornecido',
    invalidRegionId: 'Nenhum ID de região válido foi fornecido',
    invalidCityId: 'Nenhum ID de cidade válido foi fornecido',
    errorCountries: 'Erro ao obter os países',
    errorRegions: 'Erro ao obter as regiões',
    errorCities: 'Erro ao obter as cidades',
    errorCounties: 'Erro ao obter os municípios',
  },
  [Language.DE]: {
    unauthorized: 'Nicht autorisiert',
    noCountries: 'Keine Länder verfügbar',
    noRegions: 'Keine Regionen verfügbar',
    noCities: 'Keine Städte verfügbar',
    noCounties: 'Keine Gemeinden verfügbar',
    invalidCountryId: 'Es wurde keine gültige Länder-ID angegeben',
    invalidRegionId: 'Es wurde keine gültige Regions-ID angegeben',
    invalidCityId: 'Es wurde keine gültige Stadt-ID angegeben',
    errorCountries: 'Fehler beim Abrufen der Länder',
    errorRegions: 'Fehler beim Abrufen der Regionen',
    errorCities: 'Fehler beim Abrufen der Städte',
    errorCounties: 'Fehler beim Abrufen der Gemeinden',
  },
};
