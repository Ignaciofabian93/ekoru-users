import { ObjectType, Field, Int, Float } from '@nestjs/graphql';
import { DateTimeScalar } from '../../graphql/scalars';
import { TransactionKind } from '../../graphql/enums';
import { PageInfo } from '../../admins/entities/page-info.entity';

/** One entry of a seller's points history. */
@ObjectType({ description: 'Points earned (or deducted) for one activity.' })
export class PointsAward {
  @Field(() => Int)
  id: number;

  @Field(() => TransactionKind)
  kind: TransactionKind;

  @Field({
    description:
      'What earned it, e.g. order:12, deal:4, booking:9, event-registration:3.',
  })
  reference: string;

  @Field(() => Int, {
    description: 'Total credited; negative for a deduction.',
  })
  points: number;

  @Field(() => Int, { description: 'Points for doing the activity.' })
  basePoints: number;

  @Field(() => Int, {
    description: 'Points for the CO2 and water the activity saved.',
  })
  impactPoints: number;

  @Field(() => Float, { nullable: true })
  co2SavingsKG?: number | null;

  @Field(() => Float, { nullable: true })
  waterSavingsLT?: number | null;

  @Field(() => DateTimeScalar)
  createdAt: Date;
}

@ObjectType()
export class PointsAwardConnection {
  @Field(() => [PointsAward])
  nodes: PointsAward[];

  @Field(() => PageInfo)
  pageInfo: PageInfo;
}
