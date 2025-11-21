import { IsNotEmpty, IsString } from 'class-validator';

export class CreateTokenDto {
  @IsNotEmpty()
  @IsString()
  initDataRaw: string;

  @IsNotEmpty()
  @IsString()
  ip: string;
} 