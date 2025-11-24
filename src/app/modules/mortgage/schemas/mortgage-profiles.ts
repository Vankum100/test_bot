import { mysqlTable, int, varchar, decimal, boolean, timestamp } from 'drizzle-orm/mysql-core';
import { InferInsertModel, InferSelectModel } from 'drizzle-orm';

export const mortgageProfiles = mysqlTable('MortgageProfile', {
  id: int('id').primaryKey().autoincrement(),
  userId: varchar('userId', { length: 255 }).notNull(),
  propertyPrice: decimal('propertyPrice', { precision: 15, scale: 2 }).notNull(),
  propertyType: varchar('propertyType', { length: 255 }).notNull(),
  downPaymentAmount: decimal('downPaymentAmount', { precision: 15, scale: 2 }).notNull(),
  matCapitalAmount: decimal('matCapitalAmount', { precision: 15, scale: 2 }),
  matCapitalIncluded: boolean('matCapitalIncluded').notNull(),
  loanTermYears: int('loanTermYears').notNull(),
  interestRate: decimal('interestRate', { precision: 5, scale: 2 }).notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().onUpdateNow().notNull(),
});

export type MortgageProfile = InferSelectModel<typeof mortgageProfiles>;
export type NewMortgageProfile = InferInsertModel<typeof mortgageProfiles>;

