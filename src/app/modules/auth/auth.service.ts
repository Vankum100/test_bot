import {
  Injectable,
  UnauthorizedException,
  Logger,
  Inject
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AdminJwtService } from './services/admin-jwt.service';
import { UsersService } from '../user/users.service';
import { type User } from '../user/schemas/users';
import * as crypto from 'crypto';
import { CreateTokenDto } from './dto/create-token.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AdminLoginDto } from './dto/admin-login.dto';
import { AdminRefreshTokenDto } from './dto/admin-refresh-token.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { AdminJwtPayload } from './interfaces/admin-jwt-payload.interface';
import { TokenResponse } from './interfaces/token-response.interface';
import { AdminTokenResponse } from './interfaces/admin-token-response.interface';
import { Request } from 'express';
import { AccountService } from '../account/account.service';
import { AccountTokenService } from '../account-token/account-token.service';
import { RefreshTokenService } from '../refresh-token/refresh-token.service';
import { type Account } from '../account/schemas/accounts';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly botToken: string;
  private readonly refreshTokenExpiresIn = 30 * 24 * 60 * 60 * 1000; // 30 дней в миллисекундах

  constructor(
    @Inject('DATABASE') private readonly db: any,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly adminJwtService: AdminJwtService,
    private readonly accountService: AccountService,
    private readonly accountTokenService: AccountTokenService,
    private readonly refreshTokenService: RefreshTokenService
  ) {
    if (!process.env.TELEGRAM_BOT_TOKEN) {
      throw new Error('Auth service env is empty. Please set in ENV');
    }
    this.botToken = process.env.TELEGRAM_BOT_TOKEN;
  }

  // Проверка данных инициализации Telegram
  private validateTelegramInitData(initDataRaw: string): boolean {
    try {
      const initData = new URLSearchParams(initDataRaw);
      const dataCheckString = Object.entries(
        Object.fromEntries(initData.entries())
      )
        .filter(([key]) => key !== 'hash')
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');

      const secretKey = crypto
        .createHmac('sha256', 'WebAppData')
        .update(this.botToken)
        .digest();
      const hash = crypto
        .createHmac('sha256', secretKey)
        .update(dataCheckString)
        .digest('hex');

      return hash === initData.get('hash');
    } catch (error) {
      this.logger.error(
        `Error validating Telegram init data: ${error.message}`
      );
      return false;
    }
  }

  // Извлечение идентификатора пользователя из данных инициализации
  private extractUserIdFromInitData(initDataRaw: string): string | null {
    try {
      const initData = new URLSearchParams(initDataRaw);
      const user = JSON.parse(initData.get('user') || '{}');
      return user?.id?.toString() || null;
    } catch (error) {
      this.logger.error(
        `Error extracting user ID from init data: ${error.message}`
      );
      return null;
    }
  }

  // Создание токенов для пользователя
  async createToken(
    dto: CreateTokenDto,
    req?: Request
  ): Promise<TokenResponse> {
    if (!this.validateTelegramInitData(dto.initDataRaw)) {
      throw new UnauthorizedException(
        'Невалидные данные инициализации Telegram'
      );
    }

    const tgId = this.extractUserIdFromInitData(dto.initDataRaw);
    if (!tgId) {
      throw new UnauthorizedException(
        'Не удалось получить идентификатор пользователя'
      );
    }

    let user: User;
    try {
      const initData = new URLSearchParams(dto.initDataRaw);
      const userData = JSON.parse(initData.get('user') || '{}');

      user = await this.usersService.findOrCreate({
        tgId,
        username: userData.username || null,
        firstName: userData.first_name || null,
        lastName: userData.last_name || null,
        langCode: userData.language_code || null,
        invitedBy: null
      });

      if (!user.isActive) {
        await this.usersService.activateUser(tgId);
      }
    } catch (error) {
      this.logger.error(`Error creating/finding user: ${error.stack}`);
      throw new UnauthorizedException(
        'Ошибка при создании/поиске пользователя'
      );
    }

    return this.generateTokens(user, dto.ip, req?.headers['user-agent']);
  }

  // Обновление токенов
  async refreshToken(
    dto: RefreshTokenDto,
    req?: Request
  ): Promise<TokenResponse> {
    const refreshTokenRecord = await this.refreshTokenService.findByToken(
      dto.refreshToken
    );

    if (!refreshTokenRecord) {
      throw new UnauthorizedException('Невалидный или истекший refresh token');
    }

    const user = await this.usersService.findByTgId(refreshTokenRecord.userId);
    if (!user) {
      await this.refreshTokenService.removeByToken(dto.refreshToken);
      throw new UnauthorizedException('Пользователь не найден');
    }

    if (!user.isActive) {
      await this.usersService.activateUser(user.tgId);
    }

    await this.refreshTokenService.removeByToken(dto.refreshToken);

    return this.generateTokens(user, req?.ip, req?.headers['user-agent']);
  }

  // Удаление всех токенов для пользователя (при выходе из системы)
  async removeAllUserTokens(userId: string): Promise<void> {
    await this.refreshTokenService.removeByUserId(userId);
    this.logger.log(`Удалено refresh токенов для пользователя ${userId}`);
  }

  // Создание пары JWT токенов
  private async generateTokens(
    user: User,
    ip?: string,
    userAgent?: string
  ): Promise<TokenResponse> {
    const payload: JwtPayload = {
      sub: user.tgId,
      username: user.username || user.tgId
    };

    const accessToken = this.jwtService.sign(payload);

    const refreshToken = crypto.randomBytes(40).toString('hex');

    const expiresAt = new Date(Date.now() + this.refreshTokenExpiresIn);

    await this.refreshTokenService.create({
      userId: user.tgId,
      token: refreshToken,
      expiresAt,
      ip,
      userAgent
    });

    return { accessToken, refreshToken };
  }

  // Валидация JWT токена
  async validateJwtPayload(payload: JwtPayload): Promise<User | null> {
    return this.usersService.findByTgId(payload.sub);
  }

  // Авторизация администратора
  async adminLogin(
    dto: AdminLoginDto,
    req?: Request
  ): Promise<AdminTokenResponse> {
    const account = await this.accountService.validateAccount(
      dto.login,
      dto.password
    );

    return this.generateAdminTokens(
      account,
      dto.ip,
      req?.headers['user-agent']
    );
  }

  // Обновление токена администратора
  async adminRefreshToken(
    dto: AdminRefreshTokenDto,
    req?: Request
  ): Promise<AdminTokenResponse> {
    const tokenRecord = await this.accountTokenService.findByToken(
      dto.refreshToken
    );

    if (!tokenRecord) {
      throw new UnauthorizedException('Невалидный или истекший refresh token');
    }

    const account = await this.accountService.findById(tokenRecord.accountId);
    if (!account) {
      await this.accountTokenService.removeByToken(dto.refreshToken);
      throw new UnauthorizedException('Аккаунт не найден');
    }

    // Удаляем старый токен
    await this.accountTokenService.removeByToken(dto.refreshToken);

    // Генерируем новые токены
    return this.generateAdminTokens(
      account,
      req?.ip,
      req?.headers['user-agent']
    );
  }

  // Генерация токенов для администратора
  private async generateAdminTokens(
    account: Account,
    ip?: string,
    userAgent?: string
  ): Promise<AdminTokenResponse> {
    const payload: AdminJwtPayload = {
      sub: account.id,
      login: account.login,
      type: 'admin'
    };

    const accessToken = this.adminJwtService.sign(payload);

    const refreshToken = crypto.randomBytes(40).toString('hex');
    const expiresAt = new Date(Date.now() + this.refreshTokenExpiresIn);

    // Удаляем предыдущие токены аккаунта (один активный админ на аккаунт)
    await this.accountTokenService.removeByAccountId(account.id);

    // Создаем новый refresh токен
    await this.accountTokenService.create({
      accountId: account.id,
      token: refreshToken,
      expiresAt,
      ip,
      userAgent
    });

    return {
      accessToken,
      refreshToken,
      accountId: account.id,
      login: account.login
    };
  }

  // Валидация админского JWT токена
  async validateAdminJwtPayload(
    payload: AdminJwtPayload
  ): Promise<Account | null> {
    if (payload.type !== 'admin') {
      return null;
    }

    const account = await this.accountService.findById(payload.sub);
    return account;
  }
}
