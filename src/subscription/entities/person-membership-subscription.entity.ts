import { ObjectType, Field, Int } from '@nestjs/graphql';
import { DateTimeScalar } from '../../graphql/scalars';
import { PersonMembership } from './person-membership.entity';

@ObjectType()
export class PersonMembershipSubscription {
  @Field(() => Int)
  id: number;

  @Field()
  sellerId: string;

  @Field(() => Int)
  personMembershipId: number;

  @Field(() => DateTimeScalar)
  startDate: Date;

  @Field(() => DateTimeScalar, { nullable: true })
  endDate?: Date;

  @Field()
  isActive: boolean;

  @Field()
  autoRenew: boolean;

  @Field(() => Int, { nullable: true })
  paymentId?: number;

  @Field(() => DateTimeScalar)
  createdAt: Date;

  @Field(() => DateTimeScalar)
  updatedAt: Date;

  @Field(() => PersonMembership, { nullable: true })
  personMembership?: PersonMembership;
}
