import { Module } from '@nestjs/common';
import { AdminService }    from './admin.service';
import { AdminController } from './admin.controller';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';

@Module({
  imports:     [AdminAuthModule],
  controllers: [AdminController],
  providers:   [AdminService],
})
export class AdminModule {}
