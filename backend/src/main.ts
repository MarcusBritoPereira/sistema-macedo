import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

function parseOrigins(value?: string) {
  if (!value) return [];
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function isProduction() {
  return process.env.NODE_ENV === 'production';
}

function getAllowedOrigins() {
  const configured = parseOrigins(process.env.FRONTEND_URL);
  if (isProduction()) {
    return configured.length
      ? configured
      : ['https://sistemamacedo.cloud', 'https://www.sistemamacedo.cloud'];
  }

  return [
    'http://localhost:4200',
    'http://localhost:8100',
    'http://127.0.0.1:4200',
    'http://127.0.0.1:8100',
    ...configured,
  ];
}

function csrfOriginGuard(allowedOrigins: string[]) {
  const unsafeMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
  return (req: any, res: any, next: () => void) => {
    if (!unsafeMethods.has(req.method)) return next();

    const hasCookieAuth = typeof req.headers.cookie === 'string';
    if (!hasCookieAuth) return next();

    const origin = req.headers.origin;
    const referer = req.headers.referer;
    let source = origin;
    if (!source && referer) {
      try {
        source = new URL(referer).origin;
      } catch {
        source = null;
      }
    }

    if (source && allowedOrigins.includes(source)) return next();

    res.statusCode = 403;
    res.end('CSRF origin rejected');
  };
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Segurança básica
  app.use(helmet());
  app.use((req: any, res: any, next: () => void) => {
    const startedAt = Date.now();
    const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    res.setHeader('x-request-id', requestId);
    res.on('finish', () => {
      const duration = Date.now() - startedAt;
      console.log(
        JSON.stringify({
          type: 'http_request',
          requestId,
          method: req.method,
          path: req.originalUrl,
          statusCode: res.statusCode,
          durationMs: duration,
        }),
      );
    });
    next();
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalInterceptors(new LoggingInterceptor());

  const allowedOrigins = getAllowedOrigins();
  app.use(csrfOriginGuard(allowedOrigins));

  app.enableCors({
    origin: (origin, cb) => {
      // Permite requests sem Origin (curl, health-check, server-to-server)
      if (!origin) return cb(null, true);

      if (allowedOrigins.includes(origin)) return cb(null, true);

      return cb(new Error(`CORS blocked for origin: ${origin}`), false);
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  const port = Number(process.env.PORT || 3000);

  // Importante em container: ouvir em 0.0.0.0
  await app.listen(port, '0.0.0.0');
}

bootstrap();
