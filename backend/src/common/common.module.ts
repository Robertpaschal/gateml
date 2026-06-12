import { Global, Module } from '@nestjs/common';
import { EncryptionService }  from './encryption.service';
import { TokenCostService }   from './token-cost.service';
import { CacheService }       from './cache.service';
import { RateLimitService }   from './rate-limit.service';

@Global()
@Module({
  providers: [EncryptionService, TokenCostService, CacheService, RateLimitService],
  exports:   [EncryptionService, TokenCostService, CacheService, RateLimitService],
})
export class CommonModule {}
