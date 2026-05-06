import { InputType, Field, Int } from '@nestjs/graphql';
import { BusinessSubscriptionPlan } from '../../graphql/enums';

@InputType()
export class CreateBusinessMembershipInput {
  @Field(() => BusinessSubscriptionPlan)
  membershipType: BusinessSubscriptionPlan;

  @Field(() => Int)
  durationMonths: number;
}
