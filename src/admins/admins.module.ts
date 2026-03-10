import { Module } from '@nestjs/common';
import { AdminsService } from './admins.service';
import { AdminsResolver } from './admins.resolver';

@Module({
  providers: [AdminsService, AdminsResolver],
})
export class AdminsModule {}
