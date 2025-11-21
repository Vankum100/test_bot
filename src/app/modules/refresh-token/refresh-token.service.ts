import { Injectable, Inject } from '@nestjs/common';
import { eq, gt, lt, and } from 'drizzle-orm';
import { type RefreshToken, refreshTokens } from './schemas/refresh-tokens';
import { users } from '../user/schemas/users';
import { Database } from '../../../database/schema';
import { CreateRefreshTokenDto } from './dto/create-refresh-token.dto';

@Injectable()
export class RefreshTokenService {
  constructor(
    @Inject('DATABASE') private readonly db: Database,
  ) { }

  async create(dto: CreateRefreshTokenDto): Promise<RefreshToken> {
    const tokenData = {
      ...dto,
      id: crypto.randomUUID(),
    };
    await this.db.insert(refreshTokens).values(tokenData);
    const [token] = await this.db.select().from(refreshTokens)
      .where(eq(refreshTokens.token, dto.token));
    return token!;
  }

  async findByToken(token: string): Promise<RefreshToken | null> {
    const [result] = await this.db
      .select()
      .from(refreshTokens)
      .innerJoin(users, eq(refreshTokens.userId, users.tgId))
      .where(
        and(
          eq(refreshTokens.token, token),
          gt(refreshTokens.expiresAt, new Date())
        )
      );

    return result ? result.RefreshTokens : null;
  }

  async removeByUserId(userId: string): Promise<void> {
    await this.db.delete(refreshTokens)
      .where(eq(refreshTokens.userId, userId)).execute();
  }

  async removeByToken(token: string): Promise<void> {
    await this.db.delete(refreshTokens)
      .where(eq(refreshTokens.token, token));
  }

  async removeExpired(): Promise<void> {
    await this.db.delete(refreshTokens)
      .where(lt(refreshTokens.expiresAt, new Date()));
  }
} 