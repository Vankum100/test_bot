import { Injectable, Logger } from '@nestjs/common';
import { Context } from 'grammy';
import { UsersService } from '../../user/users.service';
import { BroadcastService } from './broadcast.service';
import { Helper } from '../../../classes/helper';

@Injectable()
export class BroadcastHandler {
  private readonly logger = new Logger(BroadcastHandler.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly broadcastService: BroadcastService
  ) {}

  async handleBroadcast(ctx: Context, userType: 'all'): Promise<void> {
    if (!ctx.chat?.id || !ctx.from?.id) return;

    if (!this.usersService.isAdmin(ctx.from.id.toString())) {
      await ctx.reply('У вас нет прав администратора.');
      return;
    }

    if (!ctx.message?.reply_to_message) {
      await ctx.reply(
        'Пожалуйста, используйте эту команду в ответ на сообщение, которое хотите разослать.'
      );
      return;
    }

    await ctx.reply('🚀 Рассылка запущена. Я сообщу о прогрессе.');

    try {
      const broadcastId = `${Helper.getClearDateNow()}-${Helper.getRandomString(6)}`;
      const adminId = ctx.from.id;
      const report = await this.broadcastService.start(
        ctx.message.reply_to_message,
        broadcastId,
        adminId,
        userType
      );

      if (report.total > 0) {
        await ctx.reply(
          `✅ Рассылка поставлена в очередь для ${report.total} пользователей.`
        );
      }
    } catch (error: any) {
      await ctx.reply(`⚠️ Ошибка запуска рассылки: ${error.message}`);
      this.logger.error('Broadcast failed to start:', error);
    }
  }

  async handleBroadcastRetry(ctx: Context): Promise<void> {
    if (!ctx.chat?.id || !ctx.from?.id) return;

    if (!this.usersService.isAdmin(ctx.from.id.toString())) {
      await ctx.reply('У вас нет прав администратора.');
      return;
    }

    // Извлекаем ID рассылки из команды /broadcast_retry_ID
    const messageText = ctx.message?.text;
    if (!messageText) return;

    const match = messageText.match(/^\/broadcast_retry_(.+)$/);
    if (!match) {
      await ctx.reply(
        '❌ Неверный формат команды. Используйте: /broadcast_retry_BROADCAST_ID\n\nПример: /broadcast_retry_2025-07-01 17:57:24-nn5ktn'
      );
      return;
    }

    const broadcastId = match[1];
    await ctx.reply(
      '🔄 Запускаю повторную рассылку для пользователей с ошибками...'
    );

    try {
      const adminId = ctx.from.id;
      const report = await this.broadcastService.startRetryBroadcast(
        broadcastId,
        adminId
      );

      if (report.total > 0) {
        await ctx.reply(
          `✅ Повторная рассылка запущена для ${report.total} пользователей с ошибками из рассылки ${broadcastId}.`
        );
      } else {
        await ctx.reply(
          `ℹ️ Нет активных пользователей для повторной рассылки из ${broadcastId}.`
        );
      }
    } catch (error: any) {
      await ctx.reply(`⚠️ Ошибка запуска повторной рассылки: ${error.message}`);
      this.logger.error('Retry broadcast failed to start:', error);
    }
  }
}
