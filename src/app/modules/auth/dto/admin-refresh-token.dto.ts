import { IsNotEmpty, IsString } from 'class-validator';

export class AdminRefreshTokenDto {
  @IsNotEmpty()
  @IsString()
  refreshToken: string;
} 