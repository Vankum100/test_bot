import { IsString, MinLength } from 'class-validator';

export class CreateAccountDto {
    @IsString()
    @MinLength(1, { message: 'Логин обязателен' })
    login: string;

    @IsString()
    @MinLength(6, { message: 'Пароль должен содержать минимум 6 символов' })
    password: string;
} 