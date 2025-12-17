import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType()
export class County {
  @Field(() => Int)
  id: number;

  @Field()
  county: string;
}
