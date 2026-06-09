import { Module } from '@nestjs/common';
import { AdminService }    from './admin.service';
import { AdminController } from './admin.controller';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { BillingModule }   from '../billing/billing.module';

@Module({
  imports:     [AdminAuthModule, BillingModule],
  controllers: [AdminController],
  providers:   [AdminService],
})
export class AdminModule {}
