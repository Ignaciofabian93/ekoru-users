import { InputType, Field, Int } from '@nestjs/graphql';
import { IsEnum, IsInt } from 'class-validator';
import { BusinessSubscriptionPlan } from '../../graphql/enums';

@InputType()
export class CreateBusinessMembershipInput {
  @Field(() => BusinessSubscriptionPlan)
  @IsEnum(BusinessSubscriptionPlan)
  membershipType: BusinessSubscriptionPlan;

  @Field(() => Int)
  @IsInt()
  durationMonths: number;
}
