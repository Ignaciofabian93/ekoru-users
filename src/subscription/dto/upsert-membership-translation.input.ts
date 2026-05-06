import { InputType, Field, Int } from '@nestjs/graphql';
import { Language } from '../../graphql/enums';

@InputType()
export class UpsertPersonMembershipTranslationInput {
  @Field(() => Int)
  personMembershipId: number;

  @Field(() => Language)
  language: Language;

  @Field()
  name: string;

  @Field(() => [String])
  description: string[];
}

@InputType()
export class UpsertBusinessMembershipTranslationInput {
  @Field(() => Int)
  businessMembershipId: number;

  @Field(() => Language)
  language: Language;

  @Field()
  name: string;

  @Field(() => [String])
  description: string[];
}
