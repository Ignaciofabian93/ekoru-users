import { ObjectType, Field, Int, Float } from '@nestjs/graphql';

/** A county within the radius `countiesNear` was asked for. */
@ObjectType()
export class NearbyCounty {
  @Field(() => Int)
  id: number;

  @Field()
  county: string;

  @Field(() => Int)
  cityId: number;

  @Field(() => Float, {
    description:
      "Straight-line distance from the origin to the county's reference " +
      'point, in km. 0 for the origin county itself.',
  })
  distanceKm: number;
}
