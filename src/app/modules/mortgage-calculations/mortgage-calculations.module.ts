import { Module } from '@nestjs/common';
import { MortgageCalculationsService } from './mortgage-calculations.service';
import { MortgageCalculationService } from './mortgage-calculation.service';
import { DatabaseModule } from '../../../database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [MortgageCalculationsService, MortgageCalculationService],
  exports: [MortgageCalculationsService, MortgageCalculationService],
})
export class MortgageCalculationsModule {}

