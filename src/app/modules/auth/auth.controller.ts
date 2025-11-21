import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Req,
  Res,
  Delete
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateTokenDto } from './dto/create-token.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AdminLoginDto } from './dto/admin-login.dto';
import { TokenResponse } from './interfaces/token-response.interface';
import { AdminTokenResponse } from './interfaces/admin-token-response.interface';
import { Request, Response } from 'express';
import { RequestWithUser } from './interfaces/request-with-user.interface';
import { JwtAuth } from 'src/app/decorators/jwt-auth.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private setAdminCookies(
    res: Response,
    tokenResponse: AdminTokenResponse
  ): void {
    res.cookie('admin_access_token', tokenResponse.accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 2 * 60 * 60 * 1000, // 2 часа
      path: '/'
    });

    res.cookie('admin_refresh_token', tokenResponse.refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 дней
      path: '/api/auth/admin'
    });
  }

  private clearAdminCookies(res: Response): void {
    res.clearCookie('admin_access_token', { path: '/' });
    res.clearCookie('admin_refresh_token', { path: '/api/auth/admin' });
  }

  @Post('token/create')
  @HttpCode(HttpStatus.OK)
  async createToken(
    @Body() createTokenDto: CreateTokenDto,
    @Req() req: Request
  ): Promise<TokenResponse> {
    return this.authService.createToken(createTokenDto, req);
  }

  @Post('token/refresh')
  @HttpCode(HttpStatus.OK)
  async refreshToken(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Req() req: Request
  ): Promise<TokenResponse> {
    return this.authService.refreshToken(refreshTokenDto, req);
  }

  @Delete('logout')
  @JwtAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Req() req: RequestWithUser): Promise<void> {
    await this.authService.removeAllUserTokens(req.user.tgId);
  }

  @Post('admin/login')
  @HttpCode(HttpStatus.OK)
  async adminLogin(
    @Body() adminLoginDto: AdminLoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ): Promise<{ accountId: string; login: string; message: string }> {
    const tokenResponse = await this.authService.adminLogin(adminLoginDto, req);

    this.setAdminCookies(res, tokenResponse);

    return {
      accountId: tokenResponse.accountId,
      login: tokenResponse.login,
      message: 'Успешная авторизация'
    };
  }

  @Post('admin/refresh')
  @HttpCode(HttpStatus.OK)
  async adminRefreshToken(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ): Promise<{ accountId: string; login: string; message: string }> {
    const refreshToken = req.cookies?.admin_refresh_token;

    if (!refreshToken) {
      throw new Error('Refresh token не найден в cookies');
    }

    const tokenResponse = await this.authService.adminRefreshToken(
      { refreshToken },
      req
    );

    this.setAdminCookies(res, tokenResponse);

    return {
      accountId: tokenResponse.accountId,
      login: tokenResponse.login,
      message: 'Токены обновлены'
    };
  }

  @Post('admin/logout')
  @HttpCode(HttpStatus.OK)
  async adminLogout(
    @Res({ passthrough: true }) res: Response
  ): Promise<{ message: string }> {
    this.clearAdminCookies(res);
    return { message: 'Успешный выход' };
  }
}
