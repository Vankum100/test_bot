import { applyDecorators, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

/**
 * Декоратор для защиты API методов
 * Проверяет наличие действительного JWT токена в заголовке запроса
 */
export function JwtAuth() {
  return applyDecorators(
    UseGuards(JwtAuthGuard)
  );
} 