import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { LocationService } from './location.service';
import {
  Country,
  Region,
  City,
  County,
  RawCountryConnection,
  RawCountryTranslationConnection,
  RawRegionConnection,
  RawCityConnection,
  RawCountyConnection,
} from './entities';
import { CurrentAdmin, CurrentSeller } from '../common/decorators';
import { UsersBulkUpsertResult } from '../common/bulk';
import { Language } from '../graphql/enums';
import {
  CreateCountryInput,
  CreateRegionInput,
  CreateCityInput,
  CreateCountyInput,
  CountryUpsertRowInput,
  CountryTranslationUpsertRowInput,
  RegionUpsertRowInput,
  CityUpsertRowInput,
  CountyUpsertRowInput,
} from './dto';

@Resolver()
export class LocationResolver {
  constructor(private readonly locationService: LocationService) {}

  // ─── Raw admin-panel reads (Platform Admin only) ──────────────────────────────
  // Return each table row exactly as stored (every translation, no active-language
  // filtering) so the admin panel can drive CRUD screens directly.

  @Query(() => RawCountryConnection, {
    name: 'rawCountries',
    description:
      'Paginated, unprocessed list of countries for the admin panel. Admins only.',
  })
  async getRawCountries(
    @CurrentAdmin() adminId: string,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number = 1,
    @Args('pageSize', { type: () => Int, defaultValue: 10 })
    pageSize: number = 10,
  ) {
    return this.locationService.getRawCountries({
      adminId,
      language,
      page,
      pageSize,
    });
  }

  @Query(() => RawCountryTranslationConnection, {
    name: 'rawCountryTranslations',
    description:
      'Paginated, unprocessed list of country translations for the admin panel. ' +
      'Optionally filtered by countryId. Admins only.',
  })
  async getRawCountryTranslations(
    @CurrentAdmin() adminId: string,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
    @Args('countryId', { type: () => Int, nullable: true }) countryId?: number,
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number = 1,
    @Args('pageSize', { type: () => Int, defaultValue: 10 })
    pageSize: number = 10,
  ) {
    return this.locationService.getRawCountryTranslations({
      adminId,
      language,
      countryId,
      page,
      pageSize,
    });
  }

  @Query(() => RawRegionConnection, {
    name: 'rawRegions',
    description:
      'Paginated, unprocessed list of regions for the admin panel. ' +
      'Optionally filtered by countryId. Admins only.',
  })
  async getRawRegions(
    @CurrentAdmin() adminId: string,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
    @Args('countryId', { type: () => Int, nullable: true }) countryId?: number,
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number = 1,
    @Args('pageSize', { type: () => Int, defaultValue: 10 })
    pageSize: number = 10,
  ) {
    return this.locationService.getRawRegions({
      adminId,
      language,
      countryId,
      page,
      pageSize,
    });
  }

  @Query(() => RawCityConnection, {
    name: 'rawCities',
    description:
      'Paginated, unprocessed list of cities for the admin panel. ' +
      'Optionally filtered by regionId. Admins only.',
  })
  async getRawCities(
    @CurrentAdmin() adminId: string,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
    @Args('regionId', { type: () => Int, nullable: true }) regionId?: number,
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number = 1,
    @Args('pageSize', { type: () => Int, defaultValue: 10 })
    pageSize: number = 10,
  ) {
    return this.locationService.getRawCities({
      adminId,
      language,
      regionId,
      page,
      pageSize,
    });
  }

  @Query(() => RawCountyConnection, {
    name: 'rawCounties',
    description:
      'Paginated, unprocessed list of counties for the admin panel. ' +
      'Optionally filtered by cityId. Admins only.',
  })
  async getRawCounties(
    @CurrentAdmin() adminId: string,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
    @Args('cityId', { type: () => Int, nullable: true }) cityId?: number,
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number = 1,
    @Args('pageSize', { type: () => Int, defaultValue: 10 })
    pageSize: number = 10,
  ) {
    return this.locationService.getRawCounties({
      adminId,
      language,
      cityId,
      page,
      pageSize,
    });
  }

  @Query(() => [Country], { name: 'countries' })
  async getCountries(
    @CurrentSeller() sellerId: string,
    @CurrentAdmin() adminId: string,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.locationService.getCountries({ sellerId, adminId, language });
  }

  @Query(() => [Region], { name: 'regionsByCountryId' })
  async getRegionsByCountryId(
    @Args('countryId', { type: () => Int }) countryId: number,
    @CurrentSeller() sellerId: string,
    @CurrentAdmin() adminId: string,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.locationService.getRegionsByCountry({
      countryId,
      sellerId,
      adminId,
      language,
    });
  }

  @Query(() => [City], { name: 'citiesByRegionId' })
  async getCitiesByRegionId(
    @Args('regionId', { type: () => Int }) regionId: number,
    @CurrentSeller() sellerId: string,
    @CurrentAdmin() adminId: string,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.locationService.getCitiesByRegion({
      regionId,
      sellerId,
      adminId,
      language,
    });
  }

  @Query(() => [County], { name: 'countiesByCityId' })
  async getCountiesByCityId(
    @Args('cityId', { type: () => Int }) cityId: number,
    @CurrentSeller() sellerId: string,
    @CurrentAdmin() adminId: string,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.locationService.getCountiesByCity({
      cityId,
      sellerId,
      adminId,
      language,
    });
  }

  // ─── Mutations (Platform Admin only) ──────────────────────────────────────────

  @Mutation(() => Country, {
    name: 'createCountry',
    description:
      'Create a new country with translations. Platform admins only.',
  })
  createCountry(
    @CurrentAdmin() adminId: string,
    @Args('input') input: CreateCountryInput,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.locationService.createCountry({
      adminId,
      input,
      language,
    });
  }

  @Mutation(() => Country, {
    name: 'updateCountry',
    description: 'Update country data and translations. Platform admins only.',
  })
  updateCountry(
    @CurrentAdmin() adminId: string,
    @Args('countryId', { type: () => Int }) countryId: number,
    @Args('input') input: CreateCountryInput,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.locationService.updateCountry({
      adminId,
      countryId,
      input,
      language,
    });
  }

  @Mutation(() => Region, {
    name: 'createRegion',
    description: 'Create a new region. Platform admins only.',
  })
  createRegion(
    @CurrentAdmin() adminId: string,
    @Args('input') input: CreateRegionInput,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.locationService.createRegion({
      adminId,
      input,
      language,
    });
  }

  @Mutation(() => City, {
    name: 'createCity',
    description: 'Create a new city. Platform admins only.',
  })
  createCity(
    @CurrentAdmin() adminId: string,
    @Args('input') input: CreateCityInput,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.locationService.createCity({
      adminId,
      input,
      language,
    });
  }

  @Mutation(() => City, {
    name: 'updateCity',
    description: 'Update an existing city. Platform admins only.',
  })
  updateCity(
    @CurrentAdmin() adminId: string,
    @Args('cityId', { type: () => Int }) cityId: number,
    @Args('input') input: CreateCityInput,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.locationService.updateCity({
      adminId,
      cityId,
      input,
      language,
    });
  }

  @Mutation(() => County, {
    name: 'createCounty',
    description: 'Create a new county. Platform admins only.',
  })
  createCounty(
    @CurrentAdmin() adminId: string,
    @Args('input') input: CreateCountyInput,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.locationService.createCounty({
      adminId,
      input,
      language,
    });
  }

  @Mutation(() => County, {
    name: 'updateCounty',
    description: 'Update an existing county. Platform admins only.',
  })
  updateCounty(
    @CurrentAdmin() adminId: string,
    @Args('countyId', { type: () => Int }) countyId: number,
    @Args('input') input: CreateCountyInput,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.locationService.updateCounty({
      adminId,
      countyId,
      input,
      language,
    });
  }

  @Mutation(() => Country, {
    name: 'deleteCountry',
    description:
      'Delete a country and its translations. Fails if the country is still in use. Platform admins only.',
  })
  deleteCountry(
    @CurrentAdmin() adminId: string,
    @Args('countryId', { type: () => Int }) countryId: number,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.locationService.deleteCountry({
      adminId,
      countryId,
      language,
    });
  }

  @Mutation(() => Region, {
    name: 'deleteRegion',
    description:
      'Delete a region. Fails if the region is still in use. Platform admins only.',
  })
  deleteRegion(
    @CurrentAdmin() adminId: string,
    @Args('regionId', { type: () => Int }) regionId: number,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.locationService.deleteRegion({
      adminId,
      regionId,
      language,
    });
  }

  @Mutation(() => City, {
    name: 'deleteCity',
    description:
      'Delete a city. Fails if the city is still in use. Platform admins only.',
  })
  deleteCity(
    @CurrentAdmin() adminId: string,
    @Args('cityId', { type: () => Int }) cityId: number,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.locationService.deleteCity({
      adminId,
      cityId,
      language,
    });
  }

  @Mutation(() => County, {
    name: 'deleteCounty',
    description:
      'Delete a county. Fails if the county is still in use. Platform admins only.',
  })
  deleteCounty(
    @CurrentAdmin() adminId: string,
    @Args('countyId', { type: () => Int }) countyId: number,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.locationService.deleteCounty({
      adminId,
      countyId,
      language,
    });
  }

  @Mutation(() => Region, {
    name: 'updateRegion',
    description: 'Update a region. Platform admins only.',
  })
  updateRegion(
    @CurrentAdmin() adminId: string,
    @Args('regionId', { type: () => Int }) regionId: number,
    @Args('input') input: CreateRegionInput,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.locationService.updateRegion({
      adminId,
      regionId,
      input,
      language,
    });
  }

  // ─── Bulk upserts (admin panel XLSX import / row edits) ─────────────────────
  // Rows with an id update, rows without an id create; country translation rows
  // without an id are matched by (countryId, language). Per-row failures come
  // back in errors[] without aborting the batch.

  @Mutation(() => UsersBulkUpsertResult, {
    description: 'Bulk create/update countries. Platform admins only.',
  })
  bulkUpsertCountries(
    @CurrentAdmin() adminId: string,
    @Args('rows', { type: () => [CountryUpsertRowInput] })
    rows: CountryUpsertRowInput[],
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.locationService.bulkUpsertCountries({
      adminId,
      rows,
      language,
    });
  }

  @Mutation(() => UsersBulkUpsertResult, {
    description:
      'Bulk create/update country translations, matched by (countryId, language). Platform admins only.',
  })
  bulkUpsertCountryTranslations(
    @CurrentAdmin() adminId: string,
    @Args('rows', { type: () => [CountryTranslationUpsertRowInput] })
    rows: CountryTranslationUpsertRowInput[],
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.locationService.bulkUpsertCountryTranslations({
      adminId,
      rows,
      language,
    });
  }

  @Mutation(() => UsersBulkUpsertResult, {
    description:
      'Bulk create/update regions. Setting countryId re-parents. Platform admins only.',
  })
  bulkUpsertRegions(
    @CurrentAdmin() adminId: string,
    @Args('rows', { type: () => [RegionUpsertRowInput] })
    rows: RegionUpsertRowInput[],
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.locationService.bulkUpsertRegions({ adminId, rows, language });
  }

  @Mutation(() => UsersBulkUpsertResult, {
    description:
      'Bulk create/update cities. Setting regionId re-parents. Platform admins only.',
  })
  bulkUpsertCities(
    @CurrentAdmin() adminId: string,
    @Args('rows', { type: () => [CityUpsertRowInput] })
    rows: CityUpsertRowInput[],
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.locationService.bulkUpsertCities({ adminId, rows, language });
  }

  @Mutation(() => UsersBulkUpsertResult, {
    description:
      'Bulk create/update counties. Setting cityId re-parents. Platform admins only.',
  })
  bulkUpsertCounties(
    @CurrentAdmin() adminId: string,
    @Args('rows', { type: () => [CountyUpsertRowInput] })
    rows: CountyUpsertRowInput[],
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.locationService.bulkUpsertCounties({ adminId, rows, language });
  }
}
