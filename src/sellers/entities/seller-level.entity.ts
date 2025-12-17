import { ObjectType, Field, Int } from '@nestjs/graphql';
import { DateTimeScalar, JSONScalar } from '../../graphql/scalars';

@ObjectType()
export class SellerLevel {
  @Field(() => Int)
  id: number;

  @Field()
  levelName: string;

  @Field(() => Int)
  minPoints: number;

  @Field(() => Int, { nullable: true })
  maxPoints?: number;

  @Field(() => JSONScalar, { nullable: true })
  benefits?: any;

  @Field({ nullable: true })
  badgeIcon?: string;

  @Field(() => DateTimeScalar, { nullable: true })
  createdAt?: Date;

  @Field(() => DateTimeScalar, { nullable: true })
  updatedAt?: Date;
}
