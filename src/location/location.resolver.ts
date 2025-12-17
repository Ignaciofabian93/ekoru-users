import { Resolver, Query, Args, Int } from '@nestjs/graphql';
import { LocationService } from './location.service';
import { Country, Region, City, County } from './entities';
import { CurrentSeller } from '../common/decorators';

@Resolver()
export class LocationResolver {
  constructor(private readonly locationService: LocationService) {}

  @Query(() => [Country], { name: 'countries' })
  async getCountries(@CurrentSeller() sellerId: string) {
    return this.locationService.getCountries(sellerId);
  }

  @Query(() => [Region], { name: 'regionsByCountryId' })
  async getRegionsByCountryId(
    @Args('countryId', { type: () => Int }) countryId: number,
    @CurrentSeller() sellerId: string,
  ) {
    return this.locationService.getRegionsByCountry(countryId, sellerId);
  }

  @Query(() => [City], { name: 'citiesByRegionId' })
  async getCitiesByRegionId(
    @Args('regionId', { type: () => Int }) regionId: number,
    @CurrentSeller() sellerId: string,
  ) {
    return this.locationService.getCitiesByRegion(regionId, sellerId);
  }

  @Query(() => [County], { name: 'countiesByCityId' })
  async getCountiesByCityId(
    @Args('cityId', { type: () => Int }) cityId: number,
    @CurrentSeller() sellerId: string,
  ) {
    return this.locationService.getCountiesByCity(cityId, sellerId);
  }
}
