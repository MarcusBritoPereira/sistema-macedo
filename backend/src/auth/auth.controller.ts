import {
  Controller,
  Post,
  UseGuards,
  Body,
  UnauthorizedException,
  Req,
  Res,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { ThrottlerGuard } from '@nestjs/throttler';
import { LoginDto } from './dto/login.dto';
import type { Request, Response } from 'express';

function getCookie(req: Request, name: string): string | null {
  const rawCookie = req.headers.cookie;
  if (!rawCookie) return null;
  const item = rawCookie
    .split(';')
    .map((v) => v.trim())
    .find((v) => v.startsWith(`${name}=`));
  if (!item) return null;
  return decodeURIComponent(item.slice(name.length + 1));
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @UseGuards(ThrottlerGuard)
  @Post('login')
  async login(@Body() body: LoginDto, @Res({ passthrough: true }) res: Response) {
    const user = await this.authService.validateUser(body.email, body.senha);
    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }
    const auth = await this.authService.login(user);

    const isProd = process.env.NODE_ENV === 'production';
    const cookieBase = {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax' as const,
      path: '/',
    };

    res.cookie('access_token', auth.access_token, {
      ...cookieBase,
      maxAge: 60 * 60 * 1000,
    });
    res.cookie('refresh_token', auth.refresh_token, {
      ...cookieBase,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return { user: auth.user };
  }

  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = getCookie(req, 'refresh_token');
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token ausente');
    }
    const auth = await this.authService.refresh(refreshToken);
    const isProd = process.env.NODE_ENV === 'production';
    const cookieBase = {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax' as const,
      path: '/',
    };
    res.cookie('access_token', auth.access_token, {
      ...cookieBase,
      maxAge: 60 * 60 * 1000,
    });
    res.cookie('refresh_token', auth.refresh_token, {
      ...cookieBase,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    return { ok: true };
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = getCookie(req, 'refresh_token');
    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }
    res.clearCookie('access_token', { path: '/' });
    res.clearCookie('refresh_token', { path: '/' });
    return { ok: true };
  }
}
