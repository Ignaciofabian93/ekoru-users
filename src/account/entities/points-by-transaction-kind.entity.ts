import { ObjectType, Field, Int } from '@nestjs/graphql';
import { DateTimeScalar } from '../../graphql/scalars';
import { TransactionKind } from '../../graphql/enums';

/**
 * Points awarded to a seller for each kind of transaction. One row per
 * `TransactionKind` (the column is unique), edited from the admin panel.
 */
@ObjectType()
export class PointsByTransactionKind {
  @Field(() => Int)
  id: number;

  @Field(() => TransactionKind)
  transactionKind: TransactionKind;

  @Field(() => Int)
  pointsAwarded: number;

  @Field({ nullable: true })
  description?: string;

  @Field(() => DateTimeScalar, { nullable: true })
  createdAt?: Date;

  @Field(() => DateTimeScalar, { nullable: true })
  updatedAt?: Date;
}
