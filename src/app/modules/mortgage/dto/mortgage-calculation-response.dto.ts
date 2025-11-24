export interface MortgagePayment {
  totalPayment: number;
  repaymentOfMortgageBody: number;
  repaymentOfMortgageInterest: number;
  mortgageBalance: number;
}

export interface MonthlyMortgagePayments {
  [month: string]: MortgagePayment;
}

export interface MortgagePaymentSchedule {
  [year: string]: MonthlyMortgagePayments;
}

export class MortgageCalculationResponseDto {
  monthlyPayment: number;
  totalPayment: number;
  totalOverpaymentAmount: number;
  possibleTaxDeduction: number;
  savingsDueMotherCapital: number;
  recommendedIncome: number;
  mortgagePaymentSchedule: MortgagePaymentSchedule;
}

