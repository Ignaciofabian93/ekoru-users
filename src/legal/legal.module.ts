import { Module } from '@nestjs/common';
import { LegalResolver } from './legal.resolver';
import { LegalService } from './legal.service';

/** Terms and Policies versions, acceptance and the panel's editing (LEG-1). */
@Module({
  providers: [LegalService, LegalResolver],
  exports: [LegalService],
})
export class LegalModule {}
