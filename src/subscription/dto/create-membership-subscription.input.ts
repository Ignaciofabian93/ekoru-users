import { InputType, Field, Int } from '@nestjs/graphql';
import { IsBoolean, IsInt, IsOptional } from 'class-validator';

@InputType()
export class CreatePersonMembershipSubscriptionInput {
  @Field(() => Int)
  @IsInt()
  personMembershipId: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  paymentId?: number;
}

@InputType()
export class CreateBusinessMembershipSubscriptionInput {
  @Field(() => Int)
  @IsInt()
  businessMembershipId: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  paymentId?: number;
}
