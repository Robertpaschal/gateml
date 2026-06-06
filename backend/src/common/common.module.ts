import { Global, Module } from '@nestjs/common';
import { EncryptionService } from './encryption.service';
import { TokenCostService }  from './token-cost.service';

@Global()
@Module({
  providers: [EncryptionService, TokenCostService],
  exports:   [EncryptionService, TokenCostService],
})
export class CommonModule {}
