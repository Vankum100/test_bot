import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  schema: [
    './src/app/modules/account/schemas/accounts.ts',
    './src/app/modules/account-token/schemas/account-tokens.ts',
    './src/app/modules/user/schemas/users.ts',
    './src/app/modules/refresh-token/schemas/refresh-tokens.ts',
    './src/app/modules/mortgage/schemas/mortgage-profiles.ts',
    './src/app/modules/mortgage/schemas/mortgage-calculations.ts',
  ],
  out: './database/migrations',
  dialect: 'mysql',
  dbCredentials: {
    host: process.env.HOST || 'localhost',
    port: parseInt(process.env.PORT || '3306'),
    user: process.env.USERNAME,
    password: process.env.PASSWORD || undefined,
    database: process.env.DATABASE || 'tgbot',
  },
  verbose: true,
  strict: true,
});
