import { ObjectType, Field, Int } from '@nestjs/graphql';
import { Region } from './region.entity';

@ObjectType()
export class Country {
  @Field(() => Int)
  id: number;

  @Field()
  country: string;

  @Field(() => [Region], { nullable: true })
  region?: Region[];
}
