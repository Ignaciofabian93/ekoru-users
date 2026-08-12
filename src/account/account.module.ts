import { Module } from '@nestjs/common';
import { AccountService } from './account.service';
import { AccountResolver } from './account.resolver';
import { SellersModule } from '../sellers/sellers.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { MailModule } from '../mail/mail.module';

@Module({
  // NotificationsModule for NotificationRenderer: editing a notification
  // template here has to drop that cache, or the change takes up to a minute
  // to reach the feed.
  //
  // MailModule for the password-reset link, which goes straight to SMTP rather
  // than through NotificationsService: account recovery is not subject to a
  // notification preference.
  imports: [SellersModule, NotificationsModule, MailModule],
  providers: [AccountService, AccountResolver],
  exports: [AccountService],
})
export class AccountModule {}
