import { Controller, Get, Logger }             from '@nestjs/common';
import { ApiTags, ApiOperation }              from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  HealthCheckError,
  HealthIndicatorResult,
  PrismaHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
}                                             from '@nestjs/terminus';
import { InjectQueue }                        from '@nestjs/bullmq';
import { Queue }                              from 'bullmq';
import { PrismaService }                      from '../prisma/prisma.service';
import { EMAIL_QUEUE }                        from '../email/email.queue';

@ApiTags('health')
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(
    private readonly health:          HealthCheckService,
    private readonly prismaIndicator: PrismaHealthIndicator,
    private readonly memory:          MemoryHealthIndicator,
    private readonly disk:            DiskHealthIndicator,
    private readonly prisma:          PrismaService,
    @InjectQueue(EMAIL_QUEUE) private readonly emailQueue: Queue,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Liveness + readiness probe' })
  check() {
    return this.health.check([
      () => this.prismaIndicator.pingCheck('database', this.prisma),
      () => this.checkRedis(),
      () => this.memory.checkHeap('memory_heap', 512 * 1024 * 1024),
      () => this.memory.checkRSS('memory_rss',  768 * 1024 * 1024),
      () => this.disk.checkStorage('disk', { path: '/', thresholdPercent: 0.9 }),
    ]);
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness probe (always 200 if process is up)' })
  live() {
    return { status: 'ok', ts: new Date().toISOString() };
  }

  private async checkRedis(): Promise<HealthIndicatorResult> {
    try {
      // BullMQ's client is typed as IRedisClient; cast to access ioredis ping()
      const client = await this.emailQueue.client as unknown as { ping(): Promise<string> };
      const pong   = await client.ping();
      if (pong !== 'PONG') throw new Error(`Unexpected ping response: ${pong}`);
      return { redis: { status: 'up' } };
    } catch (err) {
      this.logger.error(`Redis health check failed: ${err}`);
      throw new HealthCheckError('redis', { redis: { status: 'down', message: String(err) } });
    }
  }
}
