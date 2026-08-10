import { Module } from '@nestjs/common';
import { AccountService } from './account.service';
import { AccountResolver } from './account.resolver';
import { SellersModule } from '../sellers/sellers.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  // NotificationsModule for NotificationRenderer: editing a notification
  // template here has to drop that cache, or the change takes up to a minute
  // to reach the feed.
  imports: [SellersModule, NotificationsModule],
  providers: [AccountService, AccountResolver],
  exports: [AccountService],
})
export class AccountModule {}
