import { InputType, Field, Int, Float } from '@nestjs/graphql';

@InputType()
export class UpsertPersonMembershipPricingInput {
  @Field(() => Int)
  personMembershipId: number;

  @Field(() => Int)
  countryId: number;

  @Field()
  currency: string;

  @Field(() => Float)
  price: number;

  @Field({ nullable: true })
  isActive?: boolean;
}

@InputType()
export class UpsertBusinessMembershipPricingInput {
  @Field(() => Int)
  businessMembershipId: number;

  @Field(() => Int)
  countryId: number;

  @Field()
  currency: string;

  @Field(() => Float)
  price: number;

  @Field({ nullable: true })
  isActive?: boolean;
}
