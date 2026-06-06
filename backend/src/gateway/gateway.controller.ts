import { Controller, Post, Get, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { GatewayService }  from './gateway.service';
import { ApiKeyGuard }     from '../auth/guards/api-key.guard';
import { ApiKeyCtx, ApiKeyContext } from '../auth/decorators/api-key-context.decorator';

@ApiTags('gateway')
@ApiBearerAuth('api-key')
@UseGuards(ApiKeyGuard)
@Controller('v1')
export class GatewayController {
  constructor(private readonly gateway: GatewayService) {}

  @Post('chat/completions')
  @ApiOperation({ summary: 'OpenAI-compatible chat completions endpoint' })
  chatCompletions(@Body() body: Record<string, unknown>, @ApiKeyCtx() ctx: ApiKeyContext) {
    return this.gateway.chatCompletions(body, ctx);
  }

  @Get('models')
  @ApiOperation({ summary: 'List supported models with pricing' })
  models() {
    return this.gateway.getModels();
  }
}
