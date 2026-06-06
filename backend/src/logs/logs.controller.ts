import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { User }         from '@prisma/client';
import { LogsService }  from './logs.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser }  from '../auth/decorators/current-user.decorator';

@ApiTags('logs')
@ApiBearerAuth('jwt')
@UseGuards(JwtAuthGuard)
@Controller('logs')
export class LogsController {
  constructor(private readonly logs: LogsService) {}

  @Get()
  @ApiOperation({ summary: 'List request logs' })
  @ApiQuery({ name: 'limit',  required: false })
  @ApiQuery({ name: 'offset', required: false })
  list(
    @CurrentUser() user: User,
    @Query('limit')  limit  = '50',
    @Query('offset') offset = '0',
  ) {
    return this.logs.list(user.id, Math.min(+limit, 200), +offset);
  }
}
