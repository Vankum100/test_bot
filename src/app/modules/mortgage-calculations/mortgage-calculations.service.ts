import { Injectable, Inject } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import { mortgageCalculations } from './schemas/mortgage-calculations';
import { Database } from '../../../database/schema';
import { MortgageCalculationService } from './mortgage-calculation.service';
import type { MortgageCalculation } from './schemas/mortgage-calculations';

@Injectable()
export class MortgageCalculationsService {
  constructor(
    @Inject('DATABASE') private readonly db: Database,
    private readonly calculationService: MortgageCalculationService
  ) {}

  async createMortgageCalculation(
    userId: string,
    mortgageProfileId: number,
    calculationResult: any
  ): Promise<MortgageCalculation> {
    await this.db.insert(mortgageCalculations).values({
      userId,
      mortgageProfileId,
      monthlyPayment: calculationResult.monthlyPayment.toString(),
      totalPayment: calculationResult.totalPayment.toString(),
      totalOverpaymentAmount: calculationResult.totalOverpaymentAmount.toString(),
      possibleTaxDeduction: calculationResult.possibleTaxDeduction.toString(),
      savingsDueMotherCapital: calculationResult.savingsDueMotherCapital.toString(),
      recommendedIncome: calculationResult.recommendedIncome.toString(),
      paymentSchedule: JSON.stringify(calculationResult.mortgagePaymentSchedule),
    });

    const [calculation] = await this.db
      .select()
      .from(mortgageCalculations)
      .where(
        and(
          eq(mortgageCalculations.mortgageProfileId, mortgageProfileId),
          eq(mortgageCalculations.userId, userId)
        )
      )
      .orderBy(desc(mortgageCalculations.id))
      .limit(1);

    return calculation;
  }

  async getMortgageCalculationByProfileId(
    mortgageProfileId: number,
    userId: string
  ): Promise<MortgageCalculation | null> {
    const [calculation] = await this.db
      .select()
      .from(mortgageCalculations)
      .where(
        and(
          eq(mortgageCalculations.mortgageProfileId, mortgageProfileId),
          eq(mortgageCalculations.userId, userId)
        )
      );
    return calculation || null;
  }
}

