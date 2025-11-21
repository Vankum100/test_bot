import { mysqlTable, varchar, char, timestamp, text } from 'drizzle-orm/mysql-core';
import { InferInsertModel, InferSelectModel } from 'drizzle-orm';

export const refreshTokens = mysqlTable('RefreshTokens', {
  id: char('id', { length: 36 }).primaryKey(),
  token: text('token').notNull(),
  userId: varchar('userId', { length: 255 }).notNull(),
  expiresAt: timestamp('expiresAt').notNull(),
  ip: varchar('ip', { length: 255 }),
  userAgent: varchar('userAgent', { length: 255 }),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().onUpdateNow().notNull(),
}); 

export type RefreshToken = InferSelectModel<typeof refreshTokens>;
export type NewRefreshToken = InferInsertModel<typeof refreshTokens>; 