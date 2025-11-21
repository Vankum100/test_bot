import { accounts } from '../app/modules/account/schemas/accounts';
import { accountTokens } from '../app/modules/account-token/schemas/account-tokens';
import { users } from '../app/modules/user/schemas/users';
import { refreshTokens } from '../app/modules/refresh-token/schemas/refresh-tokens';
import { MySql2Database } from 'drizzle-orm/mysql2';

export const databaseSchema = {
  accounts,
  accountTokens,
  users,
  refreshTokens
} as const;

export type Database = MySql2Database<typeof databaseSchema>;
