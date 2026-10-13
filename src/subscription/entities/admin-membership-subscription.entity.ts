import {
  ObjectType,
  Field,
  ID,
  Int,
  Float,
  registerEnumType,
} from '@nestjs/graphql';
import { DateTimeScalar } from '../../graphql/scalars';
import { PageInfo } from '../../admins/entities/page-info.entity';

/** Which subscription table a row comes from. */
export enum MembershipKind {
  PERSON = 'PERSON',
  BUSINESS = 'BUSINESS',
}

registerEnumType(MembershipKind, {
  name: 'MembershipKind',
  description: 'Person or business membership subscription',
});

/**
 * One membership term as the admin panel lists it (ADM-12): who holds it,
 * which plan, its dates and the platform payment that bought it. The payment
 * belongs to the transactions subgraph and is read from the shared table.
 */
@ObjectType()
export class AdminMembershipSubscription {
  @Field(() => Int)
  id: number;

  @Field(() => MembershipKind)
  kind: MembershipKind;

  @Field(() => ID)
  sellerId: string;

  @Field(() => String, { nullable: true })
  sellerEmail: string | null;

  @Field(() => String, { nullable: true })
  sellerName: string | null;

  @Field(() => Int)
  membershipId: number;

  /** PersonSubscriptionPlan or BusinessSubscriptionPlan value. */
  @Field()
  plan: string;

  /** The plan's name in the requested language. */
  @Field(() => String, { nullable: true })
  planName: string | null;

  @Field(() => DateTimeScalar)
  startDate: Date;

  @Field(() => DateTimeScalar, { nullable: true })
  endDate: Date | null;

  @Field()
  isActive: boolean;

  @Field()
  autoRenew: boolean;

  @Field(() => Int, { nullable: true })
  paymentId: number | null;

  @Field(() => Float, { nullable: true })
  paymentAmount: number | null;

  @Field(() => String, { nullable: true })
  paymentStatus: string | null;

  @Field(() => String, { nullable: true })
  paymentProvider: string | null;

  @Field(() => DateTimeScalar)
  createdAt: Date;
}

@ObjectType()
export class AdminMembershipSubscriptionConnection {
  @Field(() => [AdminMembershipSubscription])
  nodes: AdminMembershipSubscription[];

  @Field(() => PageInfo)
  pageInfo: PageInfo;
}
