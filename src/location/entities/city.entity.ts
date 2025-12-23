import { ObjectType, Field, Int } from '@nestjs/graphql';
import { Region } from './region.entity';
import { County } from './county.entity';

@ObjectType()
export class City {
  @Field(() => Int)
  id: number;

  @Field()
  city: string;

  @Field(() => Int)
  regionId: number;

  @Field(() => Region, { nullable: true })
  region?: Region;

  @Field(() => [County], { nullable: true })
  county?: County[];
}
