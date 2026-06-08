import { Module }             from '@nestjs/common';
import { BillingController }  from './billing.controller';
import { BillingService }     from './billing.service';
import { PdfModule }          from '../pdf/pdf.module';

@Module({
  imports:     [PdfModule],
  controllers: [BillingController],
  providers:   [BillingService],
  exports:     [BillingService],
})
export class BillingModule {}
