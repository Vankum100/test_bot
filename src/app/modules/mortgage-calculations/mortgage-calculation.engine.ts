import {
  MortgageCalculationResponseDto,
  MortgagePaymentSchedule,
} from './dto/mortgage-calculation-response.dto';
import { MortgageCalculationInput } from './mortgage-calculation.service';

export class MortgageCalculationEngine {
  calculate(input: MortgageCalculationInput): MortgageCalculationResponseDto {
    // Если материнский капитал включен, он уже включен в downPaymentAmount
    // Поэтому для расчета суммы кредита мы вычитаем только downPaymentAmount
    // matCapitalAmount используется только для расчета экономии
    const matCapitalAmount = input.matCapitalIncluded && input.matCapitalAmount ? input.matCapitalAmount : 0;
    
    // Сумма кредита = стоимость недвижимости - первоначальный взнос
    // (первоначальный взнос уже включает материнский капитал, если matCapitalIncluded = true)
    const loanAmount = input.propertyPrice - input.downPaymentAmount;

    // Общее количество месяцев
    const totalMonths = input.loanTermYears * 12;

    // Месячная процентная ставка
    const monthlyInterestRate = input.interestRate / 12 / 100;

    // Ежемесячный платеж
    const monthlyPayment = this.calculateMonthlyPayment(loanAmount, monthlyInterestRate, totalMonths);

    // Общая сумма выплат
    const totalPayment = monthlyPayment * totalMonths;

    // Переплата по кредиту
    const totalOverpaymentAmount = totalPayment - loanAmount;

    // Налоговый вычет
    const possibleTaxDeduction = this.calculateTaxDeduction(input.propertyPrice, totalOverpaymentAmount);

    // Экономия за счет материнского капитала
    const savingsDueMotherCapital = matCapitalAmount;

    // Рекомендуемый доход
    const recommendedIncome = monthlyPayment * 2.5;

    // График платежей
    const paymentSchedule = this.calculatePaymentSchedule(
      loanAmount,
      monthlyPayment,
      monthlyInterestRate,
      totalMonths
    );

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
      let principalPayment = monthlyPayment - interestPayment;

      // Если ежемесячный платеж превышает остаток (включая проценты),
      // то основной долг равен остатку, а платеж равен остатку + проценты
      if (principalPayment > remainingBalance) {
        principalPayment = remainingBalance;
        const actualPayment = principalPayment + interestPayment;
        
        // Остаток долга на конец месяца = 0
        remainingBalance = 0;

        const year = Math.ceil(month / 12);
        const monthInYear = ((month - 1) % 12) + 1;

        if (!schedule[year.toString()]) {
          schedule[year.toString()] = {};
        }

        schedule[year.toString()][monthInYear.toString()] = {
          totalPayment: actualPayment,
          repaymentOfMortgageBody: principalPayment,
          repaymentOfMortgageInterest: interestPayment,
          mortgageBalance: 0,
        };

        // Если остаток равен 0, прекращаем расчет
        break;
      }

      // Остаток долга на конец месяца
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
}

