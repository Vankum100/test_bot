import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AdminJwtService } from './services/admin-jwt.service';
import { UsersModule } from '../user/users.module';
import { AccountModule } from '../account/account.module';
import { AccountTokenModule } from '../account-token/account-token.module';
import { RefreshTokenModule } from '../refresh-token/refresh-token.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AdminJwtStrategy } from './strategies/admin-jwt.strategy';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [
    UsersModule,
    AccountModule,
    AccountTokenModule,
    RefreshTokenModule,
    PassportModule,
    CacheModule.register({
      ttl: 15 * 60 * 1000, // 15 минут TTL по умолчанию
      max: 1000, // максимум 1000 записей в кеше
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('USER_JWT_SECRET'),
        signOptions: { expiresIn: '15m' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AdminJwtService, JwtStrategy, AdminJwtStrategy],
  exports: [AuthService, AdminJwtService, JwtModule],
})
export class AuthModule {} 