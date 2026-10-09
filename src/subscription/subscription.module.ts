import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { NotificationsModule } from '../notifications/notifications.module';
import { SubscriptionService } from './subscription.service';
import { MembershipExpiryService } from './membership-expiry.service';
import { MembershipExpiryProcessor } from './membership-expiry.processor';
import { MEMBERSHIPS_QUEUE } from './membership-expiry.queue';
import {
  SubscriptionResolver,
  PersonProfileMembershipResolver,
  BusinessProfileMembershipResolver,
} from './subscription.resolver';
import { PersonMembershipLoader } from './loaders/person-membership.loader';
import { BusinessMembershipLoader } from './loaders/business-membership.loader';

@Module({
  imports: [
    NotificationsModule, // expiry notices go through emit()
    BullModule.registerQueue({ name: MEMBERSHIPS_QUEUE }),
  ],
  providers: [
    SubscriptionService,
    MembershipExpiryService,
    MembershipExpiryProcessor,
    SubscriptionResolver,
    PersonProfileMembershipResolver,
    BusinessProfileMembershipResolver,
    PersonMembershipLoader,
    BusinessMembershipLoader,
  ],
})
export class SubscriptionModule {}
