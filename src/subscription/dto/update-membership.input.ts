import { InputType, Field, Int } from '@nestjs/graphql';
import { IsBoolean, IsEnum, IsInt, IsOptional } from 'class-validator';
import {
  PersonSubscriptionPlan,
  BusinessSubscriptionPlan,
} from '../../graphql/enums';

@InputType()
export class UpdatePersonMembershipInput {
  @Field(() => PersonSubscriptionPlan, { nullable: true })
  @IsOptional()
  @IsEnum(PersonSubscriptionPlan)
  membershipType?: PersonSubscriptionPlan;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  durationMonths?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

@InputType()
export class UpdateBusinessMembershipInput {
  @Field(() => BusinessSubscriptionPlan, { nullable: true })
  @IsOptional()
  @IsEnum(BusinessSubscriptionPlan)
  membershipType?: BusinessSubscriptionPlan;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  durationMonths?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
