import { Module } from '@nestjs/common';
import { MortgageService } from './mortgage.service';
import { MortgageController } from './mortgage.controller';

@Module({
  providers: [MortgageService],
  controllers: [MortgageController],
  exports: [MortgageService],
})
export class MortgageModule {}

