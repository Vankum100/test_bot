import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  schema: [
    './src/app/modules/account/schemas/accounts.ts',
    './src/app/modules/account-token/schemas/account-tokens.ts',
    './src/app/modules/user/schemas/users.ts',
    './src/app/modules/refresh-token/schemas/refresh-tokens.ts',
    './src/app/modules/mortgage-profiles/schemas/mortgage-profiles.ts',
    './src/app/modules/mortgage-calculations/schemas/mortgage-calculations.ts',
  ],
  out: './database/migrations',
  dialect: 'mysql',
  dbCredentials: {
    url: process.env.DATABASE_URL!
  },
  verbose: true,
  strict: true,
});