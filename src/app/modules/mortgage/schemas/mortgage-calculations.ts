import { mysqlTable, int, varchar, decimal, text, timestamp } from 'drizzle-orm/mysql-core';
import { InferInsertModel, InferSelectModel } from 'drizzle-orm';

export const mortgageCalculations = mysqlTable('MortgageCalculation', {
  id: int('id').primaryKey().autoincrement(),
  userId: varchar('userId', { length: 255 }).notNull(),
  mortgageProfileId: int('mortgageProfileId').notNull(),
  monthlyPayment: decimal('monthlyPayment', { precision: 15, scale: 2 }).notNull(),
  totalPayment: decimal('totalPayment', { precision: 15, scale: 2 }).notNull(),
  totalOverpaymentAmount: decimal('totalOverpaymentAmount', { precision: 15, scale: 2 }).notNull(),
  possibleTaxDeduction: decimal('possibleTaxDeduction', { precision: 15, scale: 2 }).notNull(),
  savingsDueMotherCapital: decimal('savingsDueMotherCapital', { precision: 15, scale: 2 }).notNull(),
  recommendedIncome: decimal('recommendedIncome', { precision: 15, scale: 2 }).notNull(),
  paymentSchedule: text('paymentSchedule').notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().onUpdateNow().notNull(),
});

export type MortgageCalculation = InferSelectModel<typeof mortgageCalculations>;
export type NewMortgageCalculation = InferInsertModel<typeof mortgageCalculations>;

