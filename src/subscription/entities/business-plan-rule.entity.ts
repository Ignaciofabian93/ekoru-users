import { ObjectType, Field, Int } from '@nestjs/graphql';
import { BusinessSubscriptionPlan } from '../../graphql/enums';

/**
 * What a business plan includes besides its price (USR-15). One per plan,
 * shared by all its terms.
 */
@ObjectType()
export class BusinessPlanRule {
  @Field(() => BusinessSubscriptionPlan)
  plan: BusinessSubscriptionPlan;

  @Field(() => Int, {
    description:
      'Admin accounts the business may have in the panel; 0 means no panel.',
  })
  panelSeats: number;
}
