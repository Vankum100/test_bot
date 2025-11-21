import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class AdminLoginDto {
  @IsNotEmpty()
  @IsString()
  login: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  ip?: string;
} 