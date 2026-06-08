import { Module }                  from '@nestjs/common';
import { UnsubscribeController }   from './unsubscribe.controller';

@Module({
  controllers: [UnsubscribeController],
})
export class UnsubscribeModule {}
