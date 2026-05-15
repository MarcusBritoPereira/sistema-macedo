import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

const SENSITIVE_KEYS = ['password', 'senha', 'token', 'secret', 'apiKey', 'clientSecret'];

function sanitize(body: any): any {
  if (!body || typeof body !== 'object') return body;
  const sanitized = { ...body };
  for (const key of SENSITIVE_KEYS) {
    if (key in sanitized) {
      sanitized[key] = '***REDACTED***';
    }
  }
  return sanitized;
}

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const { method, originalUrl, body, user } = req;
    const requestId = req.headers['x-request-id'] || 'n/a';
    const userId = user?.id || 'anonymous';
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const res = context.switchToHttp().getResponse();
          const duration = Date.now() - startTime;
          this.logger.log(
            JSON.stringify({
              requestId,
              userId,
              method,
              path: originalUrl,
              statusCode: res.statusCode,
              durationMs: duration,
              body: sanitize(body), // Safe body for audit trails
            }),
          );
          // SLO: Flag slow requests
          if (duration > 2000) {
            this.logger.warn(`SLOW REQUEST: ${method} ${originalUrl} took ${duration}ms`);
          }
        },
        error: (err) => {
          const duration = Date.now() - startTime;
          this.logger.error(
            JSON.stringify({
              requestId,
              userId,
              method,
              path: originalUrl,
              statusCode: err.status || 500,
              durationMs: duration,
              error: err.message,
            }),
          );
        },
      }),
    );
  }
}
