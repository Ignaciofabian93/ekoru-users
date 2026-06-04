import { InputType, Field, Int } from '@nestjs/graphql';
import {
  PersonSubscriptionPlan,
  BusinessSubscriptionPlan,
} from '../../graphql/enums';

@InputType()
export class UpdatePersonMembershipInput {
  @Field(() => PersonSubscriptionPlan, { nullable: true })
  membershipType?: PersonSubscriptionPlan;

  @Field(() => Int, { nullable: true })
  durationMonths?: number;

  @Field({ nullable: true })
  isActive?: boolean;
}

@InputType()
export class UpdateBusinessMembershipInput {
  @Field(() => BusinessSubscriptionPlan, { nullable: true })
  membershipType?: BusinessSubscriptionPlan;

  @Field(() => Int, { nullable: true })
  durationMonths?: number;

  @Field({ nullable: true })
  isActive?: boolean;
}
