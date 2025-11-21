import { Injectable, Inject } from '@nestjs/common';
import { eq, inArray, sql, asc, and } from 'drizzle-orm';
import { type User, users } from './schemas/users';
import { Database } from '../../../database/schema';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
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
    const [existingUser] = await this.db.select().from(users).where(eq(users.tgId, dto.tgId));
    
    if (existingUser) {
      return existingUser;
    }

    await this.db.insert(users).values(dto);
    const [newUser] = await this.db.select().from(users).where(eq(users.tgId, dto.tgId));
    return newUser!;
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
