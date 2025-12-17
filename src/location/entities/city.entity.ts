import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType()
export class City {
  @Field(() => Int)
  id: number;

  @Field()
  city: string;
}
