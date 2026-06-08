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
    transports.push(
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.errors({ stack: true }),
          winston.format.json(),       // Datadog / CloudWatch parseable
        ),
      }),
    );
  } else {
    transports.push(
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp({ format: 'HH:mm:ss' }),
          winston.format.errors({ stack: true }),
          winstonUtils.format.nestLike('GateML', {
            colors: true, prettyPrint: true, processId: false, appName: true,
          }),
        ),
      }),
    );
  }

  return WinstonModule.createLogger({ transports });
}

async function bootstrap() {
  const startMs = Date.now();
  const env     = process.env.NODE_ENV ?? 'development';
  const logger  = buildLogger(env);

  logger.log('⏳ Starting GateML backend...', 'Bootstrap');

  const app = await NestFactory.create(AppModule, { logger, rawBody: true });

  const config      = app.get(ConfigService);
  const frontendUrl = config.get<string>('FRONTEND_URL',       'http://localhost:5173');
  const adminUrl    = config.get<string>('ADMIN_FRONTEND_URL', 'http://localhost:3002');
  const port        = config.get<number>('PORT', 3001);
  const redisUrl    = config.get<string>('REDIS_URL',          'redis://localhost:6379');
  const dbUrl       = config.get<string>('DATABASE_URL',       'postgres://...');

  // ── Security ────────────────────────────────────────────────────────────────
  app.use(helmet());

  app.enableCors({
    origin:         [frontendUrl, adminUrl],
    credentials:    true,
    methods:        ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-correlation-id'],
  });

  // ── Validation ──────────────────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: false }),
  );

  // ── Swagger ─────────────────────────────────────────────────────────────────
  const swaggerConfig = new DocumentBuilder()
    .setTitle('GateML API')
    .setDescription('AI gateway — route, observe, and control your LLM traffic')
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },     'jwt')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'API Key' }, 'api-key')
    .build();
  SwaggerModule.setup('api-docs', app, SwaggerModule.createDocument(app, swaggerConfig));

  // ── Start ────────────────────────────────────────────────────────────────────
  await app.listen(port);
  const bootMs = Date.now() - startMs;

  const dbHost  = dbUrl.replace(/:[^:@]*@/, ':***@').replace(/\?.*$/, ''); // mask password
  const redisHost = redisUrl.replace(/:\/\/.*@/, '://***@');

  logger.log('', 'Bootstrap');
  logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'Bootstrap');
  logger.log('  GateML Backend — READY', 'Bootstrap');
  logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'Bootstrap');
  logger.log(`  API          → http://localhost:${port}`,              'Bootstrap');
  logger.log(`  Swagger      → http://localhost:${port}/api-docs`,     'Bootstrap');
  logger.log(`  Health       → http://localhost:${port}/health`,       'Bootstrap');
  logger.log(`  Gateway      → http://localhost:${port}/v1/chat/completions`, 'Bootstrap');
  logger.log(`  Environment  : ${env}`,                                'Bootstrap');
  logger.log(`  Node.js      : ${process.version}`,                   'Bootstrap');
  logger.log(`  Database     : ${dbHost}`,                             'Bootstrap');
  logger.log(`  Redis        : ${redisHost}`,                          'Bootstrap');
  logger.log(`  Email        : ${config.get('EMAIL_PROVIDER') ?? (config.get('RESEND_API_KEY') ? 'resend' : 'console')}`, 'Bootstrap');
  logger.log(`  Stripe       : ${config.get('STRIPE_SECRET_KEY') ? '✓ configured' : '✗ not configured'}`, 'Bootstrap');
  logger.log(`  Firebase     : ${config.get('FIREBASE_PROJECT_ID') ? '✓ configured' : '✗ not configured'}`, 'Bootstrap');
  logger.log(`  Boot time    : ${bootMs}ms`,                           'Bootstrap');
  logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'Bootstrap');
  logger.log('', 'Bootstrap');
}

bootstrap().catch(err => {
  console.error('Fatal: failed to start GateML backend', err);
  process.exit(1);
});
