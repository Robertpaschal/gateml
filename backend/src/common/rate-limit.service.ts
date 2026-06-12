import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { CacheService } from './cache.service';

@Injectable()
export class RateLimitService {
  constructor(private readonly cache: CacheService) {}

  /**
   * Sliding per-minute burst guard — applies to all calls (BYOK + managed).
   * Fail-open: if Redis is down, the check passes so the request isn't wrongly blocked.
   */
  async checkBurst(userId: string, limitPerMinute: number): Promise<void> {
    const minute = Math.floor(Date.now() / 60_000);
    const key    = `gateml:rl:burst:${userId}:${minute}`;
    const count  = await this.cache.incr(key, 60);
    if (count > limitPerMinute) {
      throw new HttpException(
        {
          statusCode:     429,
          error:          'rate_limit_exceeded',
          message:        `Rate limit exceeded. Maximum ${limitPerMinute} requests per minute on your plan.`,
          retryAfterSecs: 60,
          limit:          limitPerMinute,
          current:        count,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  /**
   * Daily managed-key cap — resets at midnight UTC.
   * Only called when the request is about to use a GateML master key.
   */
  async checkDailyManaged(userId: string, limitPerDay: number): Promise<void> {
    if (limitPerDay === -1) return;
    const day = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const key = `gateml:rl:day:managed:${userId}:${day}`;
    const count = await this.cache.incr(key, 86_400);
    if (count > limitPerDay) {
      throw new HttpException(
        {
          statusCode:     429,
          error:          'daily_managed_limit_exceeded',
          message:        `Daily managed-key limit of ${limitPerDay} requests reached. Resets at midnight UTC, or use your own API key.`,
          retryAfterSecs: this.secsUntilMidnight(),
          limit:          limitPerDay,
          current:        count,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private secsUntilMidnight(): number {
    const now      = Date.now();
    const midnight = new Date();
    midnight.setUTCHours(24, 0, 0, 0);
    return Math.ceil((midnight.getTime() - now) / 1000);
  }
}
