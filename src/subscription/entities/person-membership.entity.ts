import { ObjectType, Field, Int } from '@nestjs/graphql';
import { PersonSubscriptionPlan } from '../../graphql/enums';
import { DateTimeScalar } from '../../graphql/scalars';
import { PersonMembershipTranslation } from './person-membership-translation.entity';
import { PersonMembershipPricing } from './person-membership-pricing.entity';

@ObjectType()
export class PersonMembership {
  @Field(() => Int)
  id: number;

  @Field(() => PersonSubscriptionPlan)
  membershipType: PersonSubscriptionPlan;

  @Field(() => Int)
  durationMonths: number;

  @Field()
  isActive: boolean;

  @Field(() => DateTimeScalar)
  createdAt: Date;

  @Field(() => DateTimeScalar)
  updatedAt: Date;

  @Field(() => PersonMembershipTranslation, { nullable: true })
  translation?: PersonMembershipTranslation | null;

  @Field(() => PersonMembershipPricing, { nullable: true })
  pricing?: PersonMembershipPricing | null;
}
