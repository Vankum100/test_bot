import { Controller } from '@nestjs/common';
import { TelegramBot } from './telegram.bot';

@Controller('telegram')
export class TelegramController {
  constructor(private readonly service: TelegramBot) { }
}
