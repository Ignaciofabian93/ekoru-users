import { Resolver, Query, Mutation, Args, Int, Context } from '@nestjs/graphql';
import { LocationService } from './location.service';
import { Country, Region, City, County } from './entities';
import { CurrentSeller } from '../common/decorators';
import { Language } from '../graphql/enums';
import {
  CreateCountryInput,
  CreateRegionInput,
  CreateCityInput,
  CreateCountyInput,
} from './dto';

@Resolver()
export class LocationResolver {
  constructor(private readonly locationService: LocationService) {}

  @Query(() => [Country], { name: 'countries' })
  async getCountries(
    @CurrentSeller() sellerId: string,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.locationService.getCountries(sellerId, language);
  }

  @Query(() => [Region], { name: 'regionsByCountryId' })
  async getRegionsByCountryId(
    @Args('countryId', { type: () => Int }) countryId: number,
    @CurrentSeller() sellerId: string,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.locationService.getRegionsByCountry(
      countryId,
      sellerId,
      language,
    );
  }

  @Query(() => [City], { name: 'citiesByRegionId' })
  async getCitiesByRegionId(
    @Args('regionId', { type: () => Int }) regionId: number,
    @CurrentSeller() sellerId: string,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.locationService.getCitiesByRegion(regionId, sellerId, language);
  }

  @Query(() => [County], { name: 'countiesByCityId' })
  async getCountiesByCityId(
    @Args('cityId', { type: () => Int }) cityId: number,
    @CurrentSeller() sellerId: string,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.locationService.getCountiesByCity(cityId, sellerId, language);
  }

  // ─── Mutations (Platform Admin only) ──────────────────────────────────────────

  @Mutation(() => Country, {
    name: 'createCountry',
    description:
      'Create a new country with translations. Platform admins only.',
  })
  createCountry(
    @Context() ctx: { adminId?: string },
    @Args('input') input: CreateCountryInput,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.locationService.createCountry(
      ctx.adminId ?? '',
      input,
      language,
    );
  }

  @Mutation(() => Region, {
    name: 'createRegion',
    description: 'Create a new region. Platform admins only.',
  })
  createRegion(
    @Context() ctx: { adminId?: string },
    @Args('input') input: CreateRegionInput,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.locationService.createRegion(
      ctx.adminId ?? '',
      input,
      language,
    );
  }

  @Mutation(() => City, {
    name: 'createCity',
    description: 'Create a new city. Platform admins only.',
  })
  createCity(
    @Context() ctx: { adminId?: string },
    @Args('input') input: CreateCityInput,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.locationService.createCity(ctx.adminId ?? '', input, language);
  }

  @Mutation(() => County, {
    name: 'createCounty',
    description: 'Create a new county. Platform admins only.',
  })
  createCounty(
    @Context() ctx: { adminId?: string },
    @Args('input') input: CreateCountyInput,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.locationService.createCounty(
      ctx.adminId ?? '',
      input,
      language,
    );
  }
}
