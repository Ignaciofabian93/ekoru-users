import { ObjectType, Field, Int } from '@nestjs/graphql';
import { DateTimeScalar } from '../../graphql/scalars';
import { Language } from '../../graphql/enums';

@ObjectType()
export class SellerLabelTranslation {
  @Field(() => Int)
  id: number;

  @Field(() => Int)
  sellerLabelId: number;

  @Field(() => Language)
  language: Language;

  @Field()
  labelName: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => DateTimeScalar, { nullable: true })
  createdAt?: Date;

  @Field(() => DateTimeScalar, { nullable: true })
  updatedAt?: Date;
}
