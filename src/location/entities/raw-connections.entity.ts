import { ObjectType, Field } from '@nestjs/graphql';
import { PageInfo } from '../../admins/entities/page-info.entity';
import { Country } from './country.entity';
import { CountryTranslation } from './country-translation.entity';
import { Region } from './region.entity';
import { City } from './city.entity';
import { County } from './county.entity';

/**
 * Raw, admin-only paginated views of the location tables. Unlike the
 * seller-facing reads, these return each row exactly as stored (every
 * translation, no active-language filtering) so the admin panel can drive
 * CRUD screens directly. See `LocationService.getRaw*`.
 */

@ObjectType()
export class RawCountryConnection {
  @Field(() => [Country])
  nodes: Country[];

  @Field(() => PageInfo)
  pageInfo: PageInfo;
}

@ObjectType()
export class RawCountryTranslationConnection {
  @Field(() => [CountryTranslation])
  nodes: CountryTranslation[];

  @Field(() => PageInfo)
  pageInfo: PageInfo;
}

@ObjectType()
export class RawRegionConnection {
  @Field(() => [Region])
  nodes: Region[];

  @Field(() => PageInfo)
  pageInfo: PageInfo;
}

@ObjectType()
export class RawCityConnection {
  @Field(() => [City])
  nodes: City[];

  @Field(() => PageInfo)
  pageInfo: PageInfo;
}

@ObjectType()
export class RawCountyConnection {
  @Field(() => [County])
  nodes: County[];

  @Field(() => PageInfo)
  pageInfo: PageInfo;
}
