import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';

function parseOrigins(value?: string) {
  if (!value) return [];
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Segurança básica
  app.use(helmet());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // CORS seguro: lista explícita de origens
  const allowedOrigins = [
    'https://upfinance.cloud',
    'https://www.upfinance.cloud',
    'http://localhost:8100', // dev (Ionic/Angular)
    ...parseOrigins(process.env.FRONTEND_URL), // opcional (pode ser CSV)
  ];

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
