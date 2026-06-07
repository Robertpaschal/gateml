import { Controller, Get }                   from '@nestjs/common';
import { ApiTags, ApiOperation }              from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  PrismaHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
}                                             from '@nestjs/terminus';
import { PrismaService }                      from '../prisma/prisma.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health:  HealthCheckService,
    private readonly prismaIndicator: PrismaHealthIndicator,
    private readonly memory:  MemoryHealthIndicator,
    private readonly disk:    DiskHealthIndicator,
    private readonly prisma:  PrismaService,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Liveness + readiness probe' })
  check() {
    return this.health.check([
      () => this.prismaIndicator.pingCheck('database', this.prisma),
      () => this.memory.checkHeap('memory_heap', 512 * 1024 * 1024),   // 512 MB
      () => this.memory.checkRSS('memory_rss',  768 * 1024 * 1024),   // 768 MB
      () => this.disk.checkStorage('disk', { path: '/', thresholdPercent: 0.9 }),
    ]);
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness probe (always 200 if process is up)' })
  live() {
    return { status: 'ok', ts: new Date().toISOString() };
  }
}
