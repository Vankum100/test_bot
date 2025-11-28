import { Injectable, Inject, Logger } from '@nestjs/common';
import { eq, inArray, sql, asc, and } from 'drizzle-orm';
import { type User, users } from './schemas/users';
import { Database } from '../../../database/schema';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  private readonly adminIds: string[];

  constructor(
    @Inject('DATABASE') private readonly db: Database,
  ) {
    if (!process.env.TELEGRAM_ADMIN_IDS) {
      throw new Error('Admin ids env is empty. Please set in ENV');
    }

    this.adminIds = process.env.TELEGRAM_ADMIN_IDS?.split(',') || [];
  }

  async findOrCreate(dto: CreateUserDto): Promise<User> {
    try {
      const [existingUser] = await this.db.select().from(users).where(eq(users.tgId, dto.tgId));
      
      if (existingUser) {
        return existingUser;
      }

      await this.db.insert(users).values(dto);
      const [newUser] = await this.db.select().from(users).where(eq(users.tgId, dto.tgId));
      
      if (!newUser) {
        throw new Error(`Failed to create user with tgId: ${dto.tgId}`);
      }
      
      return newUser;
    } catch (error: any) {
      this.logger.error(`Error in findOrCreate for tgId ${dto.tgId}:`, error);
      
      // Try to extract the underlying MySQL error
      const errorDetails: any = {
        message: error?.message,
        code: error?.code,
        errno: error?.errno,
        sqlState: error?.sqlState,
        sqlMessage: error?.sqlMessage,
        stack: error?.stack,
      };
      
      // Check for nested error (drizzle-orm sometimes wraps MySQL errors)
      if (error?.cause) {
        errorDetails.cause = {
          message: error.cause?.message,
          code: error.cause?.code,
          errno: error.cause?.errno,
          sqlState: error.cause?.sqlState,
          sqlMessage: error.cause?.sqlMessage,
        };
      }
      
      // Check all enumerable properties
      if (error) {
        const errorKeys = Object.keys(error);
        errorDetails.allKeys = errorKeys;
        errorDetails.allProperties = {};
        errorKeys.forEach(key => {
          if (typeof error[key] !== 'function' && key !== 'stack') {
            errorDetails.allProperties[key] = String(error[key]).substring(0, 200);
          }
        });
      }
      
      this.logger.error(`Error details: ${JSON.stringify(errorDetails, null, 2)}`);
      throw error;
    }
  }

  async findByTgId(tgId: string): Promise<User | null> {
    const [user] = await this.db.select().from(users).where(eq(users.tgId, tgId));
    return user || null;
  }

  async activateUser(tgId: string): Promise<void> {
    await this.db.update(users)
      .set({ isActive: true })
      .where(eq(users.tgId, tgId));
  }

  async deactivateUser(tgId: string): Promise<void> {
    await this.db.update(users)
      .set({ isActive: false })
      .where(eq(users.tgId, tgId));
  }

  async getIdsBatch(offset: number, limit: number, userIds?: string[]): Promise<string[]> {
    const conditions = [eq(users.isActive, true)];
    
    if (userIds && userIds.length > 0) {
      conditions.push(inArray(users.tgId, userIds));
    }

    const result = await this.db.select({ tgId: users.tgId })
      .from(users)
      .where(and(...conditions))
      .limit(limit)
      .offset(offset)
      .orderBy(asc(users.tgId));

    return result.map((user) => user.tgId);
  }

  isAdmin(tgId: string): boolean {
    return this.adminIds.includes(tgId);
  }

  getAdminIds(): string[] {
    return this.adminIds;
  }

  async getStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    usersByLangCode: Record<string, number>;
  }> {
    const [
      totalUsersResult,
      activeUsersResult,
      inactiveUsersResult,
      usersByLangCode
    ] = await Promise.all([
      this.db.select({ count: sql<number>`count(*)` }).from(users),
      this.db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.isActive, true)),
      this.db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.isActive, false)),
      this.db.select({
        langCode: users.langCode,
        count: sql<number>`count(*)`
      })
      .from(users)
      .where(sql`${users.langCode} IS NOT NULL`)
      .groupBy(users.langCode)
    ]);

    const langCodeStats: Record<string, number> = {};
    usersByLangCode.forEach((item: any) => {
      if (item.langCode && item.count) {
        langCodeStats[item.langCode] = parseInt(item.count.toString());
      }
    });

    return {
      totalUsers: totalUsersResult[0]?.count || 0,
      activeUsers: activeUsersResult[0]?.count || 0,
      inactiveUsers: inactiveUsersResult[0]?.count || 0,
      usersByLangCode: langCodeStats,
    };
  }
}
