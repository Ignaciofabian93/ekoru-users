import { Module } from '@nestjs/common';
import { MailService } from './mail.service';

/**
 * Rendering + SMTP only. Whether an email should be sent at all is decided by
 * `NotificationsModule`, which owns the `SellerPreferences` gate; the one
 * exception is the welcome email, which SellersService sends directly because
 * it isn't subject to a preference.
 */
@Module({
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
