import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Logger } from '@nestjs/common';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      const errorMessage = err?.message || (info?.message ? `JWT ошибка: ${info.message}` : 'Пользователь не найден');
      this.logger.warn(`JWT Authentication failed: ${errorMessage}`);
      throw err || new UnauthorizedException('Необходима авторизация');
    }
    return user;
  }
} 