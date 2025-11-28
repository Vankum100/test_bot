import { Module } from '@nestjs/common';
import { MortgageProfilesService } from './mortgage-profiles.service';
import { MortgageProfilesController } from './mortgage-profiles.controller';
import { DatabaseModule } from '../../../database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [MortgageProfilesService],
  controllers: [MortgageProfilesController],
  exports: [MortgageProfilesService],
})
export class MortgageProfilesModule {}

