import { Module } from '@nestjs/common';
import { SellersService } from './sellers.service';
import { SellersResolver } from './sellers.resolver';
import { BusinessAddressResolver } from './business-address.resolver';
import { BusinessReviewResolver } from './business-review.resolver';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [MailModule],
  providers: [
    SellersService,
    SellersResolver,
    BusinessAddressResolver,
    BusinessReviewResolver,
  ],
  exports: [SellersService],
})
export class SellersModule {}
