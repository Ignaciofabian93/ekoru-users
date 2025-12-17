import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType()
export class Country {
  @Field(() => Int)
  id: number;

  @Field()
  country: string;
}
