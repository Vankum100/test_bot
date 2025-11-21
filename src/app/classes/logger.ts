import * as path from 'path';
import { Injectable, ConsoleLogger, LoggerService } from '@nestjs/common';
import { Helper } from './helper';

@Injectable()
export class Logger extends ConsoleLogger implements LoggerService {
  constructor() {
    super();
  }

  private logDir = path.resolve('./logs');
  private basicContext = ['RouterExplorer', 'RoutesResolver', 'NestApplication'];

  log(message: any, context?: string | undefined): void {
    if (this.basicContext.includes(context || '')) {
      return;
    }

    Helper.appendToFile(
      path.join(this.logDir, 'log.txt'),
      `${super.getTimestamp()} # ${context}: ${message}\r\n`,
    );
    super.log(message, context);
  }

  warn(message: any, ...optionalParams: any[]) {
    optionalParams = optionalParams.filter((item) => item);

    Helper.appendToFile(
      path.join(this.logDir, 'warn.txt'),
      `${super.getTimestamp()} # ${optionalParams[0]}: ${message}\r\n`,
    );
    super.warn(message, optionalParams);
  }

  async error(message: any, ...optionalParams: any[]) {
    optionalParams = optionalParams.filter((item) => item);

    // await this.logsBot.log(message);

    Helper.appendToFile(
      path.join(this.logDir, 'error.txt'),
      `${super.getTimestamp()} # ${optionalParams[0]}: ${message}\r\n`,
    );
    super.error(message, optionalParams);
  }
}
