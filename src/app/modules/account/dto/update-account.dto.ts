import { IsString, MinLength, IsOptional } from 'class-validator';

export class UpdateAccountDto {
    @IsOptional()
    @IsString()
    @MinLength(1, { message: 'Логин обязателен' })
    login?: string;

    @IsOptional()
    @IsString()
    @MinLength(6, { message: 'Пароль должен содержать минимум 6 символов' })
    password?: string;
} 