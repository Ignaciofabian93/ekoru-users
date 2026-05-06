import { ObjectType, Field, Int, Float } from '@nestjs/graphql';
import { DateTimeScalar } from '../../graphql/scalars';

@ObjectType()
export class BusinessMembershipPricing {
  @Field(() => Int)
  id: number;

  @Field(() => Int)
  businessMembershipId: number;

  @Field(() => Int)
  countryId: number;

  @Field()
  currency: string;

  @Field(() => Float)
  price: number;

  @Field()
  isActive: boolean;

  @Field(() => DateTimeScalar)
  createdAt: Date;

  @Field(() => DateTimeScalar)
  updatedAt: Date;
}
