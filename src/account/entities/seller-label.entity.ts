import { ObjectType, Field, Int } from '@nestjs/graphql';
import { DateTimeScalar } from '../../graphql/scalars';
import { TransactionKind } from '../../graphql/enums';
import { SellerLabelTranslation } from './seller-label-translation.entity';

@ObjectType()
export class SellerLabel {
  @Field(() => Int)
  id: number;

  @Field()
  labelName: string;

  @Field(() => TransactionKind)
  transactionKind: TransactionKind;

  @Field(() => Int)
  transactionsRequired: number;

  @Field({ nullable: true })
  description?: string;

  @Field({ nullable: true })
  badgeIcon?: string;

  @Field(() => DateTimeScalar, { nullable: true })
  createdAt?: Date;

  @Field(() => DateTimeScalar, { nullable: true })
  updatedAt?: Date;

  @Field(() => [SellerLabelTranslation], { nullable: true })
  translations?: SellerLabelTranslation[];
}
