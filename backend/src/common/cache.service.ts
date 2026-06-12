import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private client: Redis | null = null;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const url = this.config.get<string>('REDIS_URL') ?? 'redis://localhost:6379';
    this.client = new Redis(url, { lazyConnect: true, enableOfflineQueue: false, maxRetriesPerRequest: 1 });
    this.client.on('error', (err: Error) => this.logger.warn(`Redis cache error: ${err.message}`));
    this.client.connect().catch(() => { /* will surface via error event */ });
  }

  async onModuleDestroy() {
    await this.client?.quit().catch(() => { /* ignore */ });
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.client?.get(key);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSecs: number): Promise<void> {
    try {
      await this.client?.set(key, JSON.stringify(value), 'EX', ttlSecs);
    } catch {
      // silent — cache writes are best-effort
    }
  }

  /**
   * Atomically increment a counter and set TTL on first write.
   * Returns the new count, or 0 if Redis is unavailable (fail-open).
   */
  async incr(key: string, ttlSecs: number): Promise<number> {
    try {
      if (!this.client) return 0;
      const count = await this.client.incr(key);
      if (count === 1) await this.client.expire(key, ttlSecs);
      return count;
    } catch {
      return 0;
    }
  }
}
