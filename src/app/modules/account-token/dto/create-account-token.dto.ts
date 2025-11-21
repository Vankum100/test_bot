export class CreateAccountTokenDto {
    accountId: string;
    token: string;
    expiresAt: Date;
    ip?: string;
    userAgent?: string;
} 