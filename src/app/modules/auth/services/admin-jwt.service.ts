import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AdminJwtPayload } from '../interfaces/admin-jwt-payload.interface';

@Injectable()
export class AdminJwtService {
  private readonly jwtService: JwtService;

  constructor() {
    this.jwtService = new JwtService({
      secret: process.env.ADMIN_JWT_SECRET,
      signOptions: { expiresIn: '2h' }, // Увеличенное время для админов
    });
  }

  sign(payload: AdminJwtPayload): string {
    return this.jwtService.sign(payload);
  }

  verify(token: string): AdminJwtPayload {
    return this.jwtService.verify(token);
  }

  decode(token: string): any {
    return this.jwtService.decode(token);
  }
} 