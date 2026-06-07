import 'reflect-metadata';
import { NestFactory }       from '@nestjs/core';
import { ValidationPipe }    from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService }     from '@nestjs/config';
import helmet                from 'helmet';
import { WinstonModule, utilities as winstonUtils } from 'nest-winston';
import * as winston          from 'winston';
import { AppModule }         from './app.module';

function buildLogger(env: string) {
  const transports: winston.transport[] = [];

  if (env === 'production') {
    // Structured JSON for log aggregators (Datadog, CloudWatch, etc.)
    transports.push(
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.errors({ stack: true }),
          winston.format.json(),
        ),
      }),
    );
  } else {
    // Readable coloured output in dev
    transports.push(
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp({ format: 'HH:mm:ss' }),
          winston.format.errors({ stack: true }),
          winstonUtils.format.nestLike('GateML', {
            colors:        true,
            prettyPrint:   true,
            processId:     false,
            appName:       true,
          }),
        ),
      }),
    );
  }

  return WinstonModule.createLogger({ transports });
}

async function bootstrap() {
  const env    = process.env.NODE_ENV ?? 'development';
  const logger = buildLogger(env);

  const app = await NestFactory.create(AppModule, {
    logger,
    rawBody: true,
  });

  const config      = app.get(ConfigService);
  const frontendUrl = config.get<string>('FRONTEND_URL',       'http://localhost:5173');
  const adminUrl    = config.get<string>('ADMIN_FRONTEND_URL', 'http://localhost:3002');
  const port        = config.get<number>('PORT', 3001);

  app.use(helmet());

  app.enableCors({
    origin:         [frontendUrl, adminUrl],
    credentials:    true,
    methods:        ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-correlation-id'],
  });

  app.useGlobalPipes(
    new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: false }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('GateML API')
    .setDescription('AI gateway — route, observe, and control your LLM traffic')
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },     'jwt')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'API Key' }, 'api-key')
    .build();
  SwaggerModule.setup('api-docs', app, SwaggerModule.createDocument(app, swaggerConfig));

  await app.listen(port);

  logger.log(`GateML backend   → http://localhost:${port}`,  'Bootstrap');
  logger.log(`Swagger docs     → http://localhost:${port}/api-docs`, 'Bootstrap');
  logger.log(`Health check     → http://localhost:${port}/health`,   'Bootstrap');
  logger.log(`Gateway          → http://localhost:${port}/v1/chat/completions`, 'Bootstrap');
  logger.log(`Environment: ${env} | Node: ${process.version}`, 'Bootstrap');
}

bootstrap();
