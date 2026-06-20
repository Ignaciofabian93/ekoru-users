import { ObjectType, Field, ID, Int } from '@nestjs/graphql';
import { DateTimeScalar } from '../../graphql/scalars';
import { PersonMembership } from '../../subscription/entities/person-membership.entity';

@ObjectType()
export class PersonProfile {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  sellerId: string;

  @Field()
  firstName: string;

  @Field({ nullable: true })
  lastName?: string;

  @Field({ nullable: true })
  displayName?: string;

  @Field({ nullable: true })
  bio?: string;

  @Field(() => DateTimeScalar, { nullable: true })
  birthday?: Date;

  @Field({ nullable: true })
  profileImage?: string;

  @Field({ nullable: true })
  coverImage?: string;

  @Field()
  allowExchanges: boolean;

  @Field(() => Int, { nullable: true })
  personMembershipSubscriptionId?: number;

  @Field(() => PersonMembership, { nullable: true })
  membership?: PersonMembership;
}
