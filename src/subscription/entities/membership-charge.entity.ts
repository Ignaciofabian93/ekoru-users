import { ObjectType, Field, Float, Int } from '@nestjs/graphql';

/**
 * The amount to charge for one term of a membership, resolved server-side from
 * the plan's duration + the per-country pricing row. Returned by
 * `getMembershipCharge` and consumed by the transactions subgraph when it
 * creates the platform Payment — the price is never taken from the client.
 */
@ObjectType()
export class MembershipCharge {
  @Field(() => Float, {
    description: 'Price for one term, in the currency below.',
  })
  price: number;

  @Field(() => String, { description: 'ISO 4217 currency (e.g. "CLP").' })
  currency: string;

  @Field(() => Int, { description: 'Term length in months (from the plan).' })
  durationMonths: number;
}
