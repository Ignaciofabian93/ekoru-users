import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType()
export class CountryTranslation {
  @Field(() => Int)
  id: number;

  @Field(() => Int)
  countryId: number;

  @Field()
  language: string;

  @Field()
  name: string;
}
