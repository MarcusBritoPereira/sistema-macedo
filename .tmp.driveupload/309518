import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import Redis from 'ioredis';
import { randomUUID } from 'crypto';

@Injectable()
export class AuthService {
  private redis: Redis;

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  }

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (user && (await bcrypt.compare(pass, user.senha))) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { senha, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const sessionId = randomUUID();
    const payload = {
      username: user.email,
      sub: user.id,
      role: user.perfil?.nome,
    };

    // access token (1h)
    const accessToken = this.jwtService.sign(payload);

    // refresh token with sessionId (7d)
    const refreshSecret =
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
    const refreshToken = this.jwtService.sign(
      { ...payload, sessionId },
      {
        secret: refreshSecret,
        expiresIn: '7d',
      },
    );

    // Store session in Redis with 7 days TTL (604800 seconds)
    await this.redis.set(
      `session:${user.id}:${sessionId}`,
      'valid',
      'EX',
      7 * 24 * 60 * 60,
    );

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        perfil: user.perfil?.nome,
        precisaTrocarSenha: user.precisaTrocarSenha,
      },
    };
  }

  async refresh(refreshToken: string) {
    try {
      const refreshSecret =
        process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
      const payload = this.jwtService.verify(refreshToken, {
        secret: refreshSecret,
      });

      const { sub: userId, sessionId } = payload;

      if (!sessionId) {
        throw new Error('Refresh token is missing sessionId');
      }

      // Verify session exists in Redis
      const sessionKey = `session:${userId}:${sessionId}`;
      const isValid = await this.redis.get(sessionKey);

      if (!isValid) {
        throw new Error('Session is revoked or expired');
      }

      // Invalidate old session
      await this.redis.del(sessionKey);

      // Generate new session
      const newSessionId = randomUUID();
      const newPayload = {
        username: payload.username,
        sub: payload.sub,
        role: payload.role,
      };

      const newAccessToken = this.jwtService.sign(newPayload);
      const newRefreshToken = this.jwtService.sign(
        { ...newPayload, sessionId: newSessionId },
        {
          secret: refreshSecret,
          expiresIn: '7d',
        },
      );

      // Store new session in Redis
      await this.redis.set(
        `session:${userId}:${newSessionId}`,
        'valid',
        'EX',
        7 * 24 * 60 * 60,
      );

      return {
        access_token: newAccessToken,
        refresh_token: newRefreshToken,
      };
    } catch {
      throw new UnauthorizedException('Refresh token inválido ou expirado');
    }
  }

  async logout(refreshToken: string) {
    try {
      const refreshSecret =
        process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
      const payload = this.jwtService.verify(refreshToken, {
        secret: refreshSecret,
        ignoreExpiration: true, // We still want to delete it even if it just expired
      });

      const { sub: userId, sessionId } = payload;
      if (userId && sessionId) {
        await this.redis.del(`session:${userId}:${sessionId}`);
      }
    } catch {
      // Ignora erros na verificação do token durante o logout
    }
  }

  async changePassword(userId: string, novaSenha: string) {
    await this.usersService.update(userId, {
      senha: novaSenha,
      precisaTrocarSenha: false,
    });
    
    return { ok: true };
  }
}
