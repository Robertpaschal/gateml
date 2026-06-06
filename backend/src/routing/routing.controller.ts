import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsString, IsArray, IsNotEmpty } from 'class-validator';
import { User }            from '@prisma/client';
import { RoutingService, FallbackEntry } from './routing.service';
import { JwtAuthGuard }    from '../auth/guards/jwt-auth.guard';
import { CurrentUser }     from '../auth/decorators/current-user.decorator';

class UpdateRoutingDto {
  @IsString() @IsNotEmpty() primaryModel!: string;
  @IsArray()                fallbackChain!: FallbackEntry[];
}

@ApiTags('routing')
@ApiBearerAuth('jwt')
@UseGuards(JwtAuthGuard)
@Controller('routing')
export class RoutingController {
  constructor(private readonly routing: RoutingService) {}

  @Get()
  @ApiOperation({ summary: 'Get routing config' })
  get(@CurrentUser() user: User) {
    return this.routing.get(user.id);
  }

  @Put()
  @ApiOperation({ summary: 'Update routing config (primary model + fallback chain)' })
  update(@CurrentUser() user: User, @Body() dto: UpdateRoutingDto) {
    return this.routing.update(user.id, dto.primaryModel, dto.fallbackChain);
  }
}
