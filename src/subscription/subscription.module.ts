import { Module } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import {
  SubscriptionResolver,
  PersonProfileMembershipResolver,
  BusinessProfileMembershipResolver,
} from './subscription.resolver';
import { PersonMembershipLoader } from './loaders/person-membership.loader';
import { BusinessMembershipLoader } from './loaders/business-membership.loader';

@Module({
  providers: [
    SubscriptionService,
    SubscriptionResolver,
    PersonProfileMembershipResolver,
    BusinessProfileMembershipResolver,
    PersonMembershipLoader,
    BusinessMembershipLoader,
  ],
})
export class SubscriptionModule {}
