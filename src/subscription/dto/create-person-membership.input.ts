import { InputType, Field, Int } from '@nestjs/graphql';
import { IsEnum, IsInt } from 'class-validator';
import { PersonSubscriptionPlan } from '../../graphql/enums';

@InputType()
export class CreatePersonMembershipInput {
  @Field(() => PersonSubscriptionPlan)
  @IsEnum(PersonSubscriptionPlan)
  membershipType: PersonSubscriptionPlan;

  @Field(() => Int)
  @IsInt()
  durationMonths: number;
}
