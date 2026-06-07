import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger:  ['error', 'warn', 'log'],
    rawBody: true, // needed for Stripe webhook signature verification
  });

  const config = app.get(ConfigService);
  const frontendUrl  = config.get<string>('FRONTEND_URL',       'http://localhost:5173');
  const adminUrl     = config.get<string>('ADMIN_FRONTEND_URL', 'http://localhost:3002');

  // Security headers
  app.use(helmet());

  // CORS — allow both consumer frontend and admin frontend
  app.enableCors({
    origin:         [frontendUrl, adminUrl],
    credentials:    true,
    methods:        ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Global validation — strips unknown fields, transforms types
  app.useGlobalPipes(
    new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: false }),
  );

  // OpenAPI / Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle('GateML API')
    .setDescription('AI gateway — route, observe, and control your LLM traffic')
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'jwt')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'API Key' }, 'api-key')
    .build();
  SwaggerModule.setup(
    'api-docs',
    app,
    SwaggerModule.createDocument(app, swaggerConfig),
  );

  const port = config.get<number>('PORT', 3001);
  await app.listen(port);

  console.log(`\nGateML backend → http://localhost:${port}`);
  console.log(`Swagger docs   → http://localhost:${port}/api-docs`);
  console.log(`Gateway        → http://localhost:${port}/v1/chat/completions\n`);
}

bootstrap();
