import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { CurrentAdmin } from '../common/decorators';
import { Language } from '../graphql/enums';
import { DateTimeScalar } from '../graphql/scalars';
import { SubscriptionAdminService } from './subscription-admin.service';
import {
  AdminMembershipSubscriptionConnection,
  MembershipKind,
} from './entities/admin-membership-subscription.entity';

/** Membership subscriptions in the admin panel (ADM-12). */
@Resolver()
export class SubscriptionAdminResolver {
  constructor(private readonly subscriptionAdmin: SubscriptionAdminService) {}

  @Query(() => AdminMembershipSubscriptionConnection, {
    name: 'adminMembershipSubscriptions',
    description:
      'Person or business membership terms, newest first, with plan and payment. ' +
      '`search` matches the seller email or name; `endsBefore` finds terms ending ' +
      'by a date. MANAGE_USERS or VIEW_TRANSACTIONS.',
  })
  adminMembershipSubscriptions(
    @CurrentAdmin() adminId: string | undefined,
    @Args('kind', {
      type: () => MembershipKind,
      defaultValue: MembershipKind.PERSON,
    })
    kind: MembershipKind,
    @Args('active', { type: () => Boolean, nullable: true }) active?: boolean,
    @Args('plan', { nullable: true }) plan?: string,
    @Args('endsBefore', { type: () => DateTimeScalar, nullable: true })
    endsBefore?: Date,
    @Args('search', { nullable: true }) search?: string,
    @Args('page', { type: () => Int, defaultValue: 1 }) page?: number,
    @Args('pageSize', { type: () => Int, defaultValue: 20 }) pageSize?: number,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language = Language.ES,
  ) {
    return this.subscriptionAdmin.list({
      adminId,
      language,
      kind,
      active: active ?? undefined,
      plan: plan ?? undefined,
      endsBefore: endsBefore ?? undefined,
      search: search ?? undefined,
      page,
      pageSize,
    });
  }

  @Mutation(() => Int, {
    name: 'cancelMembershipSubscription',
    description:
      'Ends a membership term now and returns the seller to the free plan. ' +
      'Does not refund; refund the payment separately. Returns the id. MANAGE_USERS.',
  })
  cancelMembershipSubscription(
    @CurrentAdmin() adminId: string | undefined,
    @Args('kind', { type: () => MembershipKind }) kind: MembershipKind,
    @Args('id', { type: () => Int }) id: number,
    @Args('language', { type: () => Language, defaultValue: Language.ES })
    language: Language,
  ) {
    return this.subscriptionAdmin.cancel({ adminId, language, kind, id });
  }
}
