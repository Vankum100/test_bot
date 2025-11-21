import { applyDecorators, UseGuards } from '@nestjs/common';
import { AdminJwtAuthGuard } from '../guards/admin-jwt-auth.guard';

export function AdminJwtAuth() {
  return applyDecorators(
    UseGuards(AdminJwtAuthGuard),
  );
} 