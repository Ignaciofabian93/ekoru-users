import { ObjectType, Field, Float, Int } from '@nestjs/graphql';
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

  @Field(() => Int, { description: 'Base points for doing the activity.' })
  pointsAwarded: number;

  @Field(() => Float, {
    description: 'Impact points per kg of CO2 the activity saved.',
  })
  pointsPerKgCo2: number;

  @Field(() => Float, {
    description: 'Impact points per cubic metre (1,000 L) of water saved.',
  })
  pointsPerCubicMeterWater: number;

  @Field(() => Int, {
    nullable: true,
    description: 'Cap on impact points per activity; null = no cap.',
  })
  maxImpactPoints?: number | null;

  @Field({ nullable: true })
  description?: string;

  @Field(() => DateTimeScalar, { nullable: true })
  createdAt?: Date;

  @Field(() => DateTimeScalar, { nullable: true })
  updatedAt?: Date;
}
