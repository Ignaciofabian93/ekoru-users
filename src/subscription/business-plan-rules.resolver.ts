import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { CurrentAdmin } from '../common/decorators';
import { BusinessSubscriptionPlan, Language } from '../graphql/enums';
import { BusinessPlanRulesService } from './business-plan-rules.service';
import { BusinessPlanRule } from './entities/business-plan-rule.entity';

/** What each business plan includes besides its price (USR-15). */
@Resolver(() => BusinessPlanRule)
export class BusinessPlanRulesResolver {
  constructor(private readonly rules: BusinessPlanRulesService) {}

  @Query(() => [BusinessPlanRule], {
    name: 'businessPlanRules',
    description:
      'Every business plan in plan order with what it includes. Public, like the plans themselves.',
  })
  businessPlanRules() {
    return this.rules.list();
  }

  @Mutation(() => BusinessPlanRule, {
    name: 'updateBusinessPlanRule',
    description:
      'Set how many panel accounts a business plan gives; 0 means no panel. MANAGE_SETTINGS.',
  })
  updateBusinessPlanRule(
    @CurrentAdmin() adminId: string | undefined,
    @Args('plan', { type: () => BusinessSubscriptionPlan })
    plan: BusinessSubscriptionPlan,
    @Args('panelSeats', { type: () => Int }) panelSeats: number,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language = Language.ES,
  ) {
    return this.rules.update({ adminId, language, plan, panelSeats });
  }
}
