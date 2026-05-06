import { InputType, Field, Int } from '@nestjs/graphql';

@InputType()
export class CreatePersonMembershipSubscriptionInput {
  @Field(() => Int)
  personMembershipId: number;

  @Field({ nullable: true })
  autoRenew?: boolean;

  @Field(() => Int, { nullable: true })
  paymentId?: number;
}

@InputType()
export class CreateBusinessMembershipSubscriptionInput {
  @Field(() => Int)
  businessMembershipId: number;

  @Field({ nullable: true })
  autoRenew?: boolean;

  @Field(() => Int, { nullable: true })
  paymentId?: number;
}
