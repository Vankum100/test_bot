import {
  mysqlTable,
  varchar,
  char,
  timestamp,
  text
} from 'drizzle-orm/mysql-core';
import { InferInsertModel, InferSelectModel } from 'drizzle-orm';

export const accountTokens = mysqlTable('AccountTokens', {
  id: char('id', { length: 36 }).primaryKey(),
  accountId: char('accountId', { length: 36 }).notNull(),
  token: text('token').notNull(),
  expiresAt: timestamp('expiresAt').notNull(),
  ip: varchar('ip', { length: 255 }),
  userAgent: varchar('userAgent', { length: 255 }),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().onUpdateNow().notNull()
});

export type AccountToken = InferSelectModel<typeof accountTokens>;
export type NewAccountToken = InferInsertModel<typeof accountTokens>;
