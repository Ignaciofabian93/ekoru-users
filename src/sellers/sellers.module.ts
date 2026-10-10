import { Module } from '@nestjs/common';
import { SellersService } from './sellers.service';
import { SellersResolver } from './sellers.resolver';
import { BusinessAddressResolver } from './business-address.resolver';
import { BusinessReviewResolver } from './business-review.resolver';
import { SellerAdminService } from './admin/seller-admin.service';
import { SellerAdminResolver } from './admin/seller-admin.resolver';
import { MailModule } from '../mail/mail.module';
import { PointsModule } from '../points/points.module';

@Module({
  imports: [MailModule, PointsModule],
  providers: [
    SellersService,
    SellersResolver,
    BusinessAddressResolver,
    BusinessReviewResolver,
    SellerAdminService,
    SellerAdminResolver,
  ],
  exports: [SellersService],
})
export class SellersModule {}
