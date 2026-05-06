import { ObjectType, Field, Int } from '@nestjs/graphql';
import { BusinessSubscriptionPlan } from '../../graphql/enums';
import { DateTimeScalar } from '../../graphql/scalars';
import { BusinessMembershipTranslation } from './business-membership-translation.entity';
import { BusinessMembershipPricing } from './business-membership-pricing.entity';

@ObjectType()
export class BusinessMembership {
  @Field(() => Int)
  id: number;

  @Field(() => BusinessSubscriptionPlan)
  membershipType: BusinessSubscriptionPlan;

  @Field(() => Int)
  durationMonths: number;

  @Field()
  isActive: boolean;

  @Field(() => DateTimeScalar)
  createdAt: Date;

  @Field(() => DateTimeScalar)
  updatedAt: Date;

  @Field(() => BusinessMembershipTranslation, { nullable: true })
  translation?: BusinessMembershipTranslation | null;

  @Field(() => BusinessMembershipPricing, { nullable: true })
  pricing?: BusinessMembershipPricing | null;
}
