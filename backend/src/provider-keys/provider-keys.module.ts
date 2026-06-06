import { Module } from '@nestjs/common';
import { ProviderKeysController } from './provider-keys.controller';
import { ProviderKeysService }    from './provider-keys.service';

@Module({
  controllers: [ProviderKeysController],
  providers:   [ProviderKeysService],
  exports:     [ProviderKeysService],
})
export class ProviderKeysModule {}
