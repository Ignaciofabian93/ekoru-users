import { ObjectType, Field, Int, Float } from '@nestjs/graphql';
import { City } from './city.entity';

@ObjectType()
export class County {
  @Field(() => Int)
  id: number;

  @Field()
  county: string;

  @Field(() => Int)
  cityId: number;

  @Field(() => Float, {
    nullable: true,
    description: "Latitude of the county's reference point (WGS84).",
  })
  latitude?: number | null;

  @Field(() => Float, {
    nullable: true,
    description: "Longitude of the county's reference point (WGS84).",
  })
  longitude?: number | null;

  @Field(() => City, { nullable: true })
  city?: City;
}
