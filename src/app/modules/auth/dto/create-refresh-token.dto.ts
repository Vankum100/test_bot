import { IsNotEmpty, IsString, IsDate, IsOptional } from 'class-validator';

export class CreateRefreshTokenDto {
  @IsNotEmpty()
  @IsString()
  userId: string;

  @IsNotEmpty()
  @IsString()
  token: string;

  @IsNotEmpty()
  @IsDate()
  expiresAt: Date;

  @IsOptional()
  @IsString()
  ip?: string;

  @IsOptional()
  @IsString()
  userAgent?: string;
} 