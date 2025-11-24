import { Injectable, Inject } from '@nestjs/common';
import { eq, sql, and, desc } from 'drizzle-orm';
import { mortgageProfiles } from './schemas/mortgage-profiles';
import { mortgageCalculations } from './schemas/mortgage-calculations';
import { Database } from '../../../database/schema';
import { CreateMortgageProfileDto } from './dto/create-mortgage-profile.dto';
import {
  MortgageCalculationResponseDto,
  MortgagePaymentSchedule,
  MortgagePayment,
  MonthlyMortgagePayments
} from './dto/mortgage-calculation-response.dto';
import type { MortgageProfile } from './schemas/mortgage-profiles';
import type { MortgageCalculation } from './schemas/mortgage-calculations';

@Injectable()
export class MortgageService {
  constructor(@Inject('DATABASE') private readonly db: Database) {}

  async createMortgageCalculation(
    userId: string,
    dto: CreateMortgageProfileDto
  ): Promise<MortgageCalculationResponseDto> {
    // 1. Сумма кредита = стоимость недвижимости - первоначальный взнос - мат.капитал
    const matCapitalAmount = dto.matCapitalIncluded && dto.matCapitalAmount ? dto.matCapitalAmount : 0;
    const loanAmount = dto.propertyPrice - dto.downPaymentAmount - matCapitalAmount;

    // 2. Общее количество месяцев = срок ипотеки (в годах) * 12
    const totalMonths = dto.loanTermYears * 12;

    // 3. Месячная процентная ставка = годовая процентная ставка / 12 / 100
    const monthlyInterestRate = dto.interestRate / 12 / 100;

    // 4. Ежемесячный платеж = сумма кредита * месячная процентная ставка * (1 + месячная процентная ставка)^общее количество месяцев / ((1 + месячная процентная ставка)^общее количество месяцев - 1)
    const monthlyPayment = this.calculateMonthlyPayment(loanAmount, monthlyInterestRate, totalMonths);

    // 5. Общая сумма выплат = ежемесячный платеж * общее количество месяцев
    const totalPayment = monthlyPayment * totalMonths;

    // 6. Переплата по кредиту = общая сумма выплат - сумма кредита
    const totalOverpaymentAmount = totalPayment - loanAmount;

    // 7. Налоговый вычет
    const possibleTaxDeduction = this.calculateTaxDeduction(dto.propertyPrice, totalOverpaymentAmount);

    // 8. Экономия за счет материнского капитала
    const savingsDueMotherCapital = matCapitalAmount;

    // 9. Рекомендуемый доход (обычно ежемесячный платеж * 2.5 для безопасности)
    const recommendedIncome = monthlyPayment * 2.5;

    // 10. График платежей
    const paymentSchedule = this.calculatePaymentSchedule(
      loanAmount,
      monthlyPayment,
      monthlyInterestRate,
      totalMonths
    );

    // Сохраняем MortgageProfile
    await this.db.insert(mortgageProfiles).values({
      userId,
      propertyPrice: dto.propertyPrice.toString(),
      propertyType: dto.propertyType,
      downPaymentAmount: dto.downPaymentAmount.toString(),
      matCapitalAmount: dto.matCapitalAmount?.toString() || null,
      matCapitalIncluded: dto.matCapitalIncluded,
      loanTermYears: dto.loanTermYears,
      interestRate: dto.interestRate.toString(),
    });

    // Получаем ID вставленного профиля (последний вставленный для этого пользователя)
    const [mortgageProfile] = await this.db
      .select()
      .from(mortgageProfiles)
      .where(eq(mortgageProfiles.userId, userId))
      .orderBy(desc(mortgageProfiles.id))
      .limit(1);
    
    const profileId = mortgageProfile.id;

    // Сохраняем MortgageCalculation
    await this.db.insert(mortgageCalculations).values({
      userId,
      mortgageProfileId: profileId,
      monthlyPayment: monthlyPayment.toString(),
      totalPayment: totalPayment.toString(),
      totalOverpaymentAmount: totalOverpaymentAmount.toString(),
      possibleTaxDeduction: possibleTaxDeduction.toString(),
      savingsDueMotherCapital: savingsDueMotherCapital.toString(),
      recommendedIncome: recommendedIncome.toString(),
      paymentSchedule: JSON.stringify(paymentSchedule),
    });

    return {
      monthlyPayment,
      totalPayment,
      totalOverpaymentAmount,
      possibleTaxDeduction,
      savingsDueMotherCapital,
      recommendedIncome,
      mortgagePaymentSchedule: paymentSchedule,
    };
  }

  private calculateMonthlyPayment(
    loanAmount: number,
    monthlyInterestRate: number,
    totalMonths: number
  ): number {
    if (monthlyInterestRate === 0) {
      return loanAmount / totalMonths;
    }

    const numerator = loanAmount * monthlyInterestRate * Math.pow(1 + monthlyInterestRate, totalMonths);
    const denominator = Math.pow(1 + monthlyInterestRate, totalMonths) - 1;
    return numerator / denominator;
  }

  private calculateTaxDeduction(propertyPrice: number, totalOverpaymentAmount: number): number {
    // За покупку жилья: меньшее из стоимости недвижимости или 2.000.000 * 0.13 (максимум 260.000)
    const purchaseDeduction = Math.min(propertyPrice, 2000000) * 0.13;

    // За уплаченные проценты: меньшее из переплаты по кредиту или 3.000.000 * 0.13 (максимум 390.000)
    const interestDeduction = Math.min(totalOverpaymentAmount, 3000000) * 0.13;

    return purchaseDeduction + interestDeduction;
  }

  private calculatePaymentSchedule(
    loanAmount: number,
    monthlyPayment: number,
    monthlyInterestRate: number,
    totalMonths: number
  ): MortgagePaymentSchedule {
    const schedule: MortgagePaymentSchedule = {};
    let remainingBalance = loanAmount;

    for (let month = 1; month <= totalMonths; month++) {
      // Проценты за месяц = остаток долга на начало месяца * месячная ставка
      const interestPayment = remainingBalance * monthlyInterestRate;

      // Основной долг за месяц = ежемесячный платеж - проценты за месяц
      const principalPayment = monthlyPayment - interestPayment;

      // Остаток долга на конец месяца = остаток долга на начало месяца - основной долг за месяц
      remainingBalance = remainingBalance - principalPayment;

      const year = Math.ceil(month / 12);
      const monthInYear = ((month - 1) % 12) + 1;

      if (!schedule[year.toString()]) {
        schedule[year.toString()] = {};
      }

      schedule[year.toString()][monthInYear.toString()] = {
        totalPayment: monthlyPayment,
        repaymentOfMortgageBody: principalPayment,
        repaymentOfMortgageInterest: interestPayment,
        mortgageBalance: Math.max(0, remainingBalance), // Убеждаемся, что баланс не отрицательный
      };
    }

    return schedule;
  }

  async getMortgageProfileById(id: number, userId: string): Promise<MortgageProfile | null> {
    const [profile] = await this.db
      .select()
      .from(mortgageProfiles)
      .where(and(
        eq(mortgageProfiles.id, id),
        eq(mortgageProfiles.userId, userId)
      ));
    return profile || null;
  }

  async getMortgageCalculationByProfileId(
    mortgageProfileId: number,
    userId: string
  ): Promise<MortgageCalculation | null> {
    const [calculation] = await this.db
      .select()
      .from(mortgageCalculations)
      .where(and(
        eq(mortgageCalculations.mortgageProfileId, mortgageProfileId),
        eq(mortgageCalculations.userId, userId)
      ));
    return calculation || null;
  }
}

