import { Module } from '@nestjs/common';
import { MortgageService } from './mortgage.service';
import { MortgageController } from './mortgage.controller';
import { MortgageProfilesModule } from '../mortgage-profiles/mortgage-profiles.module';
import { MortgageCalculationsModule } from '../mortgage-calculations/mortgage-calculations.module';

@Module({
  imports: [MortgageProfilesModule, MortgageCalculationsModule],
  providers: [MortgageService],
  controllers: [MortgageController],
  exports: [MortgageService],
})
export class MortgageModule {}

