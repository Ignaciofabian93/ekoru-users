import { ObjectType, Field, ID } from '@nestjs/graphql';
import { DateTimeScalar } from '../../graphql/scalars';

@ObjectType()
export class PersonProfile {
  @Field(() => ID)
  id: string;

  @Field()
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
}
