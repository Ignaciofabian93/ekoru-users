import { ObjectType, Field, Int } from '@nestjs/graphql';
import { DateTimeScalar } from '../../graphql/scalars';
import { Language } from '../../graphql/enums';

@ObjectType()
export class SellerLevelTranslation {
  @Field(() => Int)
  id: number;

  @Field(() => Int)
  sellerLevelId: number;

  @Field(() => Language)
  language: Language;

  @Field()
  levelName: string;

  @Field(() => DateTimeScalar, { nullable: true })
  createdAt?: Date;

  @Field(() => DateTimeScalar, { nullable: true })
  updatedAt?: Date;
}
