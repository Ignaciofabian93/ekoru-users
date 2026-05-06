import { ObjectType, Field, Int } from '@nestjs/graphql';
import { Language } from '../../graphql/enums';
import { DateTimeScalar } from '../../graphql/scalars';

@ObjectType()
export class BusinessMembershipTranslation {
  @Field(() => Int)
  id: number;

  @Field(() => Int)
  businessMembershipId: number;

  @Field(() => Language)
  language: Language;

  @Field()
  name: string;

  @Field(() => [String])
  description: string[];

  @Field(() => DateTimeScalar)
  createdAt: Date;

  @Field(() => DateTimeScalar)
  updatedAt: Date;
}
