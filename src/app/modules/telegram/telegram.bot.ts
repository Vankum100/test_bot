import { Bot, BotError, InlineKeyboard, type Context } from 'grammy';
import { BOT_COMMANDS } from './bot.commands';
import { Injectable, Logger } from '@nestjs/common';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { type User } from '../user/schemas/users';
import { UsersService } from '../user/users.service';
import { BroadcastHandler } from './broadcast/broadcast.handler';

@Injectable()
export class TelegramBot {
  private readonly logger = new Logger(TelegramBot.name);

  private readonly bot: Bot;
  private readonly chatId: string;
  private readonly adminIds: string[];
  private readonly appUrl: string;

  constructor(
    private readonly usersService: UsersService,
    private readonly broadcastHandler: BroadcastHandler
  ) {
    if (
      !process.env.TELEGRAM_BOT_TOKEN ||
      !process.env.TELEGRAM_CHAT_ID ||
      !process.env.TELEGRAM_ADMIN_IDS ||
      !process.env.APP_URL
    ) {
      throw new Error('Main telegram bot env is empty. Please set in ENV');
    }
    this.chatId = process.env.TELEGRAM_CHAT_ID;
    this.adminIds = (process.env.TELEGRAM_ADMIN_IDS || '')
      .split(',')
      .map(id => id.trim())
      .filter(Boolean);
    this.appUrl = process.env.APP_URL;
    this.bot = new Bot(process.env.TELEGRAM_BOT_TOKEN);

    this.initializeBot();
  }

  private initializeBot(): void {
    this.userHandler();
    this.setupAdminHandlers();
    this.setupBroadcastHandlers();
    this.bot.start();

    this.bot.catch((err: BotError) => {
      const ctx = err.ctx;
      const error: any = err.error;
      if (
        error.error_code === 403 &&
        error.description?.includes('bot was blocked')
      ) {
        if (ctx?.from?.id) {
          this.usersService.deactivateUser(ctx.from.id.toString());
        }
        this.logger.error(`User ${ctx?.from?.id} has blocked the bot.`);
      } else {
        this.logger.error(`An error occurred: ${err.stack}`);
      }
    });
  }

  /*
  --- USER ---
  */

  private userHandler(): void {
    this.bot.command(BOT_COMMANDS.START, async context => {
      await this.commandStart(context);
    });
  }

  /*
  --- ADMIN ---
  */

  private setupAdminHandlers(): void {
    this.bot.command(BOT_COMMANDS.STATS, async ctx => {
      await this.commandStats(ctx);
    });
  }

  private setupBroadcastHandlers(): void {
    this.bot.command(BOT_COMMANDS.BROADCAST, async ctx => {
      await this.broadcastHandler.handleBroadcast(ctx, 'all');
    });

    // Обработка команд повторной рассылки
    this.bot.on('message:text', async ctx => {
      if (ctx.message.text.startsWith('/broadcast_retry_')) {
        await this.broadcastHandler.handleBroadcastRetry(ctx);
      }
    });
  }

  private async commandStart(context: Context): Promise<void> {
    if (!context?.chatId) {
      return;
    }

    const invatedBy = this.extractRefCode(context.message?.text);
    const user = await this.getTgUser(context?.chatId, context, invatedBy);
    if (!user) {
      return;
    }

    if (!user.isActive) {
      await this.usersService.activateUser(user.tgId);
    }

    const message = `${user.firstName}, привет!`;
    const keyboard = new InlineKeyboard().webApp(
      'Открыть приложение',
      this.appUrl
    );

    await context.reply(message, { reply_markup: keyboard });
  }

  private async commandStats(context: Context): Promise<void> {
    if (!context?.from?.id) {
      return;
    }

    const userId = context.from.id.toString();

    if (!this.usersService.isAdmin(userId)) {
      await context.reply('У вас нет прав для выполнения этой команды.');
      return;
    }

    try {
      const stats = await this.usersService.getStats();

      const langCodeStatsText = Object.entries(stats.usersByLangCode)
        .map(([lang, count]) => `  - ${lang}: ${count}\n`)
        .join('\n');

      const message =
        `Статистика пользователей:` +
        `\nВсего пользователей: ${stats.totalUsers}` +
        `\n✅ Активных: ${stats.activeUsers}` +
        `\n❌ Неактивных: ${stats.inactiveUsers}` +
        `\nПо языкам:\n${langCodeStatsText || 'Нет данных'}`;

      await context.reply(message);
    } catch (error) {
      this.logger.error('Ошибка при получении статистики:', error);
      await context.reply('Произошла ошибка при получении статистики.');
    }
  }

  private extractRefCode(message: string | undefined): string {
    if (message && message.startsWith(`/${BOT_COMMANDS.START} `)) {
      return message.substring(7);
    }
    return '';
  }

  private async getTgUser(
    chatId: number,
    context: Context | undefined,
    invatedBy?: string | null
  ): Promise<User | null> {
    const user = context?.from;
    if (!user) {
      await this.bot.api.sendMessage(
        chatId,
        `Oops! You are hidden under masks of shadows. Please write from another account or device.`
      );
      await this.logger.error(
        `Error: Info about user (tgId: ${chatId}) is hidden.`
      );
      return null;
    }

    const dto: CreateUserDto = {
      tgId: user.id.toString(),
      username: user.username ?? null,
      firstName: user.first_name ?? null,
      lastName: user.last_name ?? null,
      langCode: user.language_code ?? null,
      invitedBy: invatedBy || null
    };

    return await this.usersService.findOrCreate(dto);
  }

  getBotApi() {
    return this.bot.api;
  }
}
