import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Inject
} from '@nestjs/common';
import { eq, like, desc, sql } from 'drizzle-orm';
import { accounts } from './schemas/accounts';
import { accountTokens } from '../account-token/schemas/account-tokens';
import { type Account } from './schemas/accounts';
import { Database } from '../../../database/schema';
import { CreateAccountDto } from './dto/create-account.dto';
import {
  DATABASE_CONSTANTS,
  PAGINATION_CONSTANTS
} from '../../../database/constants';
import { DatabaseUtils } from '../../../database/utils';
import * as bcrypt from 'bcrypt';
import { UpdateAccountDto } from './dto/update-account.dto';

@Injectable()
export class AccountService {
  constructor(@Inject('DATABASE') private readonly db: Database) {}

  async create(dto: CreateAccountDto): Promise<Account> {
    const existingAccount = await this.findByLogin(dto.login);
    if (existingAccount) {
      throw new ConflictException('Аккаунт с таким логином уже существует');
    }

    const hashedPassword = await bcrypt.hash(
      dto.password,
      DATABASE_CONSTANTS.PASSWORD_SALT_ROUNDS
    );
    const accountData = {
      ...dto,
      id: crypto.randomUUID(),
      password: hashedPassword
    };
    await this.db.insert(accounts).values(accountData);
    const [account] = await this.db
      .select()
      .from(accounts)
      .where(eq(accounts.login, dto.login));
    return account!;
  }

  async update(id: string, dto: UpdateAccountDto): Promise<number> {
    if (dto.login) {
      const existingAccount = await this.findByLogin(dto.login);
      if (existingAccount && existingAccount.id !== id) {
        throw new ConflictException('Аккаунт с таким логином уже существует');
      }
    }

    const updateData = { ...dto };

    if (dto.password) {
      updateData.password = await bcrypt.hash(
        dto.password,
        DATABASE_CONSTANTS.PASSWORD_SALT_ROUNDS
      );
    }

    await this.db.update(accounts).set(updateData).where(eq(accounts.id, id));

    return 1;
  }

  async findAll(): Promise<Account[]> {
    const accountsList = await this.db.select().from(accounts);
    return accountsList;
  }

  async findById(id: string): Promise<Account | null> {
    const [account] = await this.db
      .select()
      .from(accounts)
      .where(eq(accounts.id, id));
    return account || null;
  }

  async findByLogin(login: string): Promise<Account | null> {
    const [account] = await this.db
      .select()
      .from(accounts)
      .where(eq(accounts.login, login));
    return account || null;
  }

  async validateAccount(login: string, password: string): Promise<Account> {
    const account = await this.findByLogin(login);

    if (!account) {
      throw new UnauthorizedException('Неверный логин или пароль');
    }

    const isPasswordValid = await bcrypt.compare(password, account.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Неверный логин или пароль');
    }

    return account;
  }

  async findAllPaginated(
    page: number = PAGINATION_CONSTANTS.DEFAULT_PAGE,
    limit: number = PAGINATION_CONSTANTS.DEFAULT_LIMIT,
    search?: string
  ): Promise<{ accounts: Account[]; total: number }> {
    const { page: validPage, limit: validLimit } =
      DatabaseUtils.validatePaginationParams(page, limit);
    const offset = DatabaseUtils.calculateOffset(validPage, validLimit);
    const sanitizedSearch = DatabaseUtils.sanitizeSearchTerm(search);

    const searchCondition = sanitizedSearch
      ? like(accounts.login, `%${sanitizedSearch}%`)
      : undefined;

    const [totalResult] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(accounts)
      .where(searchCondition || undefined);

    const accountsList = await this.db
      .select()
      .from(accounts)
      .where(searchCondition || undefined)
      .limit(validLimit)
      .offset(offset)
      .orderBy(desc(accounts.createdAt));

    // Исключаем пароли из результата
    const accountsWithoutPasswords = accountsList.map(
      ({ password, ...account }) => account
    );

    return {
      accounts: accountsWithoutPasswords as Account[],
      total: totalResult.count
    };
  }

  async remove(id: string): Promise<void> {
    if (!DatabaseUtils.validateId(id)) {
      throw new Error('Некорректный ID аккаунта');
    }

    const account = await this.findById(id);
    if (!account) {
      throw new Error('Аккаунт не найден');
    }

    // Удаляем связанные токены
    await this.db.delete(accountTokens).where(eq(accountTokens.accountId, id));

    // Удаляем аккаунт
    await this.db.delete(accounts).where(eq(accounts.id, id));
  }
}
