import { ObjectType, Field, ID, Int } from '@nestjs/graphql';
import { DateTimeScalar } from '../../graphql/scalars';

/**
 * The caller's own membership, flattened across the person / business split so
 * a client can render "your current plan" without knowing which table it came
 * from or asking for the seller's type first.
 *
 * `plan` is the membership type as a plain string (`FREEMIUM`, `BASIC`, …)
 * because the two enums do not share members; clients match it against the plan
 * key they already render.
 */
@ObjectType()
export class MySubscription {
  @Field(() => Int)
  id: number;

  @Field(() => ID, {
    description: 'Membership row this subscription points at.',
  })
  membershipId: number;

  @Field(() => String, { description: 'Membership type, e.g. "BASIC".' })
  plan: string;

  @Field(() => Boolean, {
    description: 'True when it came from the business catalogue.',
  })
  isBusiness: boolean;

  @Field(() => DateTimeScalar)
  startDate: Date;

  @Field(() => DateTimeScalar, {
    nullable: true,
    description: 'When access ends. Null means no term was recorded.',
  })
  endDate?: Date | null;

  @Field(() => Boolean)
  isActive: boolean;

  @Field(() => Boolean, {
    description:
      'Always false today — renewals are one-off until recurring billing lands.',
  })
  autoRenew: boolean;
}
