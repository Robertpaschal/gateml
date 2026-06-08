import { Module }         from '@nestjs/common';
import { PromosService }    from './promos.service';
import { PromosController } from './promos.controller';
import { PrismaModule }     from '../prisma/prisma.module';
import { AuditModule }      from '../audit/audit.module';

@Module({
  imports:     [PrismaModule, AuditModule],
  providers:   [PromosService],
  controllers: [PromosController],
  exports:     [PromosService],
})
export class PromosModule {}
