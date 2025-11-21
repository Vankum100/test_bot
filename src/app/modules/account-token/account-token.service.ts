import { Injectable, Inject } from '@nestjs/common';
import { eq, gt, and } from 'drizzle-orm';
import { accountTokens } from './schemas/account-tokens';
import { accounts } from '../account/schemas/accounts';
import { type AccountToken } from './schemas/account-tokens';
import { Database } from '../../../database/schema';
import { CreateAccountTokenDto } from './dto/create-account-token.dto';

@Injectable()
export class AccountTokenService {
  constructor(@Inject('DATABASE') private readonly db: Database) {}

  async create(dto: CreateAccountTokenDto): Promise<AccountToken> {
    const tokenData = {
      ...dto,
      id: crypto.randomUUID()
    };
    await this.db.insert(accountTokens).values(tokenData);
    const [token] = await this.db
      .select()
      .from(accountTokens)
      .where(eq(accountTokens.token, dto.token));
    return token!;
  }

  async findByToken(token: string): Promise<AccountToken | null> {
    const [result] = await this.db
      .select()
      .from(accountTokens)
      .innerJoin(accounts, eq(accountTokens.accountId, accounts.id))
      .where(
        and(
          eq(accountTokens.token, token),
          gt(accountTokens.expiresAt, new Date())
        )
      );

    return result ? result.AccountTokens : null;
  }

  async removeByAccountId(accountId: string): Promise<void> {
    await this.db
      .delete(accountTokens)
      .where(eq(accountTokens.accountId, accountId));
  }

  async removeByToken(token: string): Promise<void> {
    await this.db.delete(accountTokens).where(eq(accountTokens.token, token));
  }
}
