import { ObjectType, Field, Int } from '@nestjs/graphql';
import { City } from './city.entity';

@ObjectType()
export class County {
  @Field(() => Int)
  id: number;

  @Field()
  county: string;

  @Field(() => Int)
  cityId: number;

  @Field(() => City, { nullable: true })
  city?: City;
}
