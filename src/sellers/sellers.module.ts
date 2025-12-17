import { Module } from '@nestjs/common';
import { SellersService } from './sellers.service';
import { SellersResolver } from './sellers.resolver';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [MailModule],
  providers: [SellersService, SellersResolver],
  exports: [SellersService],
})
export class SellersModule {}
