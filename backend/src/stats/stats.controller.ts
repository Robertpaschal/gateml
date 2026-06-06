import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { User }          from '@prisma/client';
import { StatsService }  from './stats.service';
import { JwtAuthGuard }  from '../auth/guards/jwt-auth.guard';
import { CurrentUser }   from '../auth/decorators/current-user.decorator';

@ApiTags('stats')
@ApiBearerAuth('jwt')
@UseGuards(JwtAuthGuard)
@Controller('stats')
export class StatsController {
  constructor(private readonly stats: StatsService) {}

  @Get()
  @ApiOperation({ summary: '24-hour dashboard stats' })
  get(@CurrentUser() user: User) {
    return this.stats.getDashboardStats(user.id);
  }
}
