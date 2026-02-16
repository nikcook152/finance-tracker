import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Security headers via Helmet
  app.use(helmet());

  // CORS configuration from environment variable
  const corsOrigin = configService.get<string>('CORS_ORIGIN') || 'http://localhost:5173,http://localhost';
  const allowedOrigins = corsOrigin.split(',').map((origin) => origin.trim());

  app.enableCors({
    origin: allowedOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe());
  await app.listen(3000);
}
bootstrap();
