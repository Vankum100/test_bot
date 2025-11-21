import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { AuthService } from '../auth.service';
import { AdminJwtPayload } from '../interfaces/admin-jwt-payload.interface';
import { type Account } from '../../account/schemas/accounts';

@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'admin-jwt') {
  constructor(private readonly authService: AuthService) {
    if (!process.env.ADMIN_JWT_SECRET) {
      throw new Error('Admin JWT secret is empty. Please set in ENV');
    }
    super({
      jwtFromRequest: req => {
        return req?.cookies?.admin_access_token || null;
      },
      ignoreExpiration: false,
      secretOrKey: process.env.ADMIN_JWT_SECRET
    });
  }

  async validate(payload: AdminJwtPayload): Promise<Account> {
    const account = await this.authService.validateAdminJwtPayload(payload);
    if (!account) {
      throw new UnauthorizedException('Неавторизованный доступ');
    }
    return account;
  }
}
