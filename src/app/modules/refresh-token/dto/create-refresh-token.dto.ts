export class CreateRefreshTokenDto {
    userId: string;
    token: string;
    expiresAt: Date;
    ip?: string;
    userAgent?: string;
} 