import { Injectable } from '@nestjs/common';
import {
  MortgageCalculationResponseDto,
  MortgagePaymentSchedule,
} from './dto/mortgage-calculation-response.dto';
import { MortgageCalculationEngine } from './mortgage-calculation.engine';
import type { MortgageProfile } from '../mortgage-profiles/schemas/mortgage-profiles';

export interface MortgageCalculationInput {
  propertyPrice: number;
  downPaymentAmount: number;
  matCapitalAmount: number | null;
  matCapitalIncluded: boolean;
  loanTermYears: number;
  interestRate: number;
}

@Injectable()
export class MortgageCalculationService {
  private readonly calculationEngine = new MortgageCalculationEngine();

  calculateMortgage(input: MortgageCalculationInput): MortgageCalculationResponseDto {
    return this.calculationEngine.calculate(input);
  }

  calculateMortgageFromProfile(profile: MortgageProfile): MortgageCalculationResponseDto {
    const input: MortgageCalculationInput = {
      propertyPrice: parseFloat(profile.propertyPrice),
      downPaymentAmount: parseFloat(profile.downPaymentAmount),
      matCapitalAmount: profile.matCapitalAmount ? parseFloat(profile.matCapitalAmount) : null,
      matCapitalIncluded: profile.matCapitalIncluded,
      loanTermYears: profile.loanTermYears,
      interestRate: parseFloat(profile.interestRate),
    };
    return this.calculateMortgage(input);
  }
}

