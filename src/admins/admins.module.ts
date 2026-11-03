import { Module } from '@nestjs/common';
import { MailModule } from '../mail/mail.module';
import { AdminsService } from './admins.service';
import { AdminsResolver } from './admins.resolver';
import { AdminPasswordService } from './admin-password.service';
import { BusinessTeamService } from './business-team.service';
import { BusinessTeamResolver } from './business-team.resolver';

@Module({
  imports: [MailModule],
  providers: [
    AdminsService,
    AdminsResolver,
    AdminPasswordService,
    BusinessTeamService,
    BusinessTeamResolver,
  ],
  // The subscription module opens a business's panel when it buys a plan.
  exports: [BusinessTeamService],
})
export class AdminsModule {}
