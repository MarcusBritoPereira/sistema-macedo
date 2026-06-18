import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';

type HealthStatus = 'ok' | 'degraded';
type DependencyStatus = 'up' | 'down';

export interface DependencyHealth {
  status: DependencyStatus;
  latencyMs: number;
  error?: string;
}

export interface HealthCheckResponse {
  status: HealthStatus;
  timestamp: string;
  uptimeSeconds: number;
  version: string;
  environment: string;
  checks: {
    api: DependencyHealth;
    database?: DependencyHealth;
    redis?: DependencyHealth;
  };
}

@Injectable()
export class HealthService implements OnModuleDestroy {
  private readonly redis: Redis;

  constructor(private readonly prisma: PrismaService) {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      connectTimeout: 1000,
    });
  }

  async onModuleDestroy() {
    if (this.redis.status !== 'end') {
      await this.redis.quit().catch(() => undefined);
    }
  }

  async getHealth(): Promise<HealthCheckResponse> {
    const [database, redis] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
    ]);

    return this.buildResponse({ database, redis });
  }

  async getDatabaseHealth(): Promise<HealthCheckResponse> {
    const database = await this.checkDatabase();
    return this.buildResponse({ database });
  }

  async getRedisHealth(): Promise<HealthCheckResponse> {
    const redis = await this.checkRedis();
    return this.buildResponse({ redis });
  }

  private buildResponse(checks: {
    database?: DependencyHealth;
    redis?: DependencyHealth;
  }): HealthCheckResponse {
    const dependencies = Object.values(checks);
    const degraded = dependencies.some((check) => check.status === 'down');

    return {
      status: degraded ? 'degraded' : 'ok',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      version: process.env.npm_package_version || '0.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks: {
        api: {
          status: 'up',
          latencyMs: 0,
        },
        ...checks,
      },
    };
  }

  private async checkDatabase(): Promise<DependencyHealth> {
    const startedAt = Date.now();

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'up',
        latencyMs: Date.now() - startedAt,
      };
    } catch (error) {
      return {
        status: 'down',
        latencyMs: Date.now() - startedAt,
        error: this.getSafeErrorMessage(error),
      };
    }
  }

  private async checkRedis(): Promise<DependencyHealth> {
    const startedAt = Date.now();

    try {
      if (this.redis.status === 'wait' || this.redis.status === 'end') {
        await this.redis.connect();
      }

      await this.redis.ping();
      return {
        status: 'up',
        latencyMs: Date.now() - startedAt,
      };
    } catch (error) {
      return {
        status: 'down',
        latencyMs: Date.now() - startedAt,
        error: this.getSafeErrorMessage(error),
      };
    }
  }

  private getSafeErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return 'Unknown dependency error';
  }
}
