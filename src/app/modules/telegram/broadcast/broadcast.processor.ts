import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger, forwardRef, Inject } from '@nestjs/common';
import { Message } from 'grammy/types';
import { TelegramBot } from '../telegram.bot';
import { BroadcastJob, BroadcastButton, ParsedBroadcastMessage } from './types';
import { BROADCAST_CONFIG } from './broadcast.config';
import { UsersService } from '../../../modules/user/users.service';
import { BroadcastService } from './broadcast.service';

@Processor('broadcast')
export class BroadcastProcessor {
  private readonly logger = new Logger(BroadcastProcessor.name);

  constructor(
    private readonly telegramBot: TelegramBot,
    private readonly usersService: UsersService,
    @Inject(forwardRef(() => BroadcastService))
    private readonly broadcastService: BroadcastService
  ) {}

  @Process({ name: 'send', concurrency: BROADCAST_CONFIG.CONCURRENCY })
  async handle(
    job: Job<BroadcastJob>
  ): Promise<'sent' | 'blocked' | 'retry_scheduled'> {
    const {
      tgId,
      payload,
      parsedMessage,
      broadcastId,
      retryCount = 0
    } = job.data;

    this.logger.debug(
      `Processing job for user ${tgId}, broadcastId: ${broadcastId}, retryCount: ${retryCount}`
    );

    try {
      if (parsedMessage && parsedMessage.buttons.length > 0) {
        await this.sendMessageWithButtons(tgId, payload, parsedMessage);
      } else {
        await this.forwardMessage(tgId, payload);
      }
      this.logger.debug(
        `Successfully sent message to user ${tgId}, broadcastId: ${broadcastId}, retryCount: ${retryCount}`
      );
      return 'sent';
    } catch (error: any) {
      if (
        error.error_code === 403 ||
        (error.error_code === 400 &&
          error.description?.includes('chat not found'))
      ) {
        await this.usersService.deactivateUser(tgId);
        const reason =
          error.error_code === 403 ? 'blocked the bot' : 'chat not found';
        this.logger.warn(
          `User ${tgId} ${reason}, deactivated. BroadcastId: ${broadcastId}, retryCount: ${retryCount}`
        );
        return 'blocked';
      }

      if (error.error_code === 429 && error.parameters?.retry_after) {
        const retryAfter = error.parameters.retry_after;
        const maxRetries = BROADCAST_CONFIG.MAX_RETRY_ATTEMPTS;

        if (retryCount < maxRetries) {
          const delayMs =
            (retryAfter + BROADCAST_CONFIG.RETRY_BUFFER_SECONDS) * 1000;

          this.logger.warn(
            `Rate limit hit for user ${tgId}, scheduling retry ${retryCount + 1}/${maxRetries} after ${retryAfter + BROADCAST_CONFIG.RETRY_BUFFER_SECONDS}s. BroadcastId: ${broadcastId}`
          );

          // Планируем повторную попытку с задержкой
          await this.broadcastService.scheduleRetry(
            {
              ...job.data,
              retryCount: retryCount + 1
            },
            delayMs
          );

          this.logger.debug(
            `Retry scheduled for user ${tgId}, broadcastId: ${broadcastId}, newRetryCount: ${retryCount + 1}`
          );
          return 'retry_scheduled';
        } else {
          this.logger.error(
            `Max retry attempts reached for user ${tgId}, giving up. BroadcastId: ${broadcastId}`
          );
          throw new Error(
            `Max retry attempts (${maxRetries}) reached for RETRY_AFTER`
          );
        }
      }

      // Прочие ошибки логируем и перебрасываем для retry
      this.logger.error(
        `Failed to send message to ${tgId} (broadcastId: ${broadcastId}, retryCount: ${retryCount}):`,
        error
      );
      throw error;
    }
  }

  private async sendMessageWithButtons(
    tgId: string,
    message: Message,
    parsedMessage: ParsedBroadcastMessage
  ): Promise<void> {
    const botApi = this.telegramBot.getBotApi();
    const chatId = parseInt(tgId);

    const inlineKeyboard = this.createInlineKeyboard(parsedMessage.buttons);

    if (message.photo && message.photo.length > 0) {
      // Отправляем фото с кнопками
      const photo = message.photo[message.photo.length - 1]; // Берем самое большое фото
      await botApi.sendPhoto(chatId, photo.file_id, {
        caption: parsedMessage.cleanMessage || undefined,
        caption_entities: parsedMessage.captionEntities,
        reply_markup: { inline_keyboard: inlineKeyboard }
      });
    } else if (message.video) {
      // Отправляем видео с кнопками
      await botApi.sendVideo(chatId, message.video.file_id, {
        caption: parsedMessage.cleanMessage || undefined,
        caption_entities: parsedMessage.captionEntities,
        reply_markup: { inline_keyboard: inlineKeyboard }
      });
    } else if (message.document) {
      // Отправляем документ с кнопками
      await botApi.sendDocument(chatId, message.document.file_id, {
        caption: parsedMessage.cleanMessage || undefined,
        caption_entities: parsedMessage.captionEntities,
        reply_markup: { inline_keyboard: inlineKeyboard }
      });
    } else {
      // Отправляем текстовое сообщение с кнопками
      await botApi.sendMessage(chatId, parsedMessage.cleanMessage, {
        entities: parsedMessage.entities,
        reply_markup: { inline_keyboard: inlineKeyboard }
      });
    }
  }

  private createInlineKeyboard(buttons: BroadcastButton[]): any[][] {
    return buttons.map(button => [
      {
        text: button.button,
        url: button.link
      }
    ]);
  }

  private async forwardMessage(tgId: string, message: Message): Promise<void> {
    const botApi = this.telegramBot.getBotApi();
    const chatId = parseInt(tgId);

    await botApi.copyMessage(chatId, message.chat.id, message.message_id);
  }
}
