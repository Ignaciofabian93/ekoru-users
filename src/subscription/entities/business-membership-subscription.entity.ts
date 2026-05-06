import { ObjectType, Field, Int } from '@nestjs/graphql';
import { DateTimeScalar } from '../../graphql/scalars';
import { BusinessMembership } from './business-membership.entity';

@ObjectType()
export class BusinessMembershipSubscription {
  @Field(() => Int)
  id: number;

  @Field()
  sellerId: string;

  @Field(() => Int)
  businessMembershipId: number;

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

  @Field(() => BusinessMembership, { nullable: true })
  businessMembership?: BusinessMembership;
}
