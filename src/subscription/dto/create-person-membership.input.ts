import { InputType, Field, Int } from '@nestjs/graphql';
import { PersonSubscriptionPlan } from '../../graphql/enums';

@InputType()
export class CreatePersonMembershipInput {
  @Field(() => PersonSubscriptionPlan)
  membershipType: PersonSubscriptionPlan;

  @Field(() => Int)
  durationMonths: number;
}
