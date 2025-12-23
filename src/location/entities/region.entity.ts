import { ObjectType, Field, Int } from '@nestjs/graphql';
import { Country } from './country.entity';
import { City } from './city.entity';

@ObjectType()
export class Region {
  @Field(() => Int)
  id: number;

  @Field()
  region: string;

  @Field(() => Int)
  countryId: number;

  @Field(() => Country, { nullable: true })
  country?: Country;

  @Field(() => [City], { nullable: true })
  city?: City[];
}
