import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { Logger } from './classes/logger';
import { UsersModule } from './modules/user/users.module';
import { TelegramBotModule } from './modules/telegram/telegram.bots.module';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './modules/auth/auth.module';
import { AccountModule } from './modules/account/account.module';
import { AccountTokenModule } from './modules/account-token/account-token.module';
import { RefreshTokenModule } from './modules/refresh-token/refresh-token.module';
import { MortgageModule } from './modules/mortgage/mortgage.module';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env',
      isGlobal: true
    }),
    DatabaseModule,
    BullModule.forRootAsync({
      useFactory: () => ({
        redis: {
          host: 'localhost',
          port: 6379,
        },
      }),
    }),
    ScheduleModule.forRoot(),
    TelegramBotModule,
    AccountModule,
    AccountTokenModule,
    RefreshTokenModule,
    AuthModule,
    UsersModule,
    MortgageModule,
  ],
  controllers: [],
  providers: [
    Logger,
  ]
})
export class AppModule { }
