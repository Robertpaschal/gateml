import { Controller, Get, Put, Delete, Param, Body, UseGuards, HttpCode } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';
import { LLMProvider, User }    from '@prisma/client';
import { ProviderKeysService }  from './provider-keys.service';
import { JwtAuthGuard }         from '../auth/guards/jwt-auth.guard';
import { CurrentUser }          from '../auth/decorators/current-user.decorator';

class UpsertProviderKeyDto {
  @IsString() @IsNotEmpty() key!: string;
}

@ApiTags('provider-keys')
@ApiBearerAuth('jwt')
@UseGuards(JwtAuthGuard)
@Controller('provider-keys')
export class ProviderKeysController {
  constructor(private readonly providerKeys: ProviderKeysService) {}

  @Get()
  @ApiOperation({ summary: 'List connected providers' })
  list(@CurrentUser() user: User) {
    return this.providerKeys.list(user.id);
  }

  @Put(':provider')
  @ApiOperation({ summary: 'Add or update a provider API key (stored encrypted)' })
  upsert(
    @CurrentUser() user: User,
    @Param('provider') provider: LLMProvider,
    @Body() dto: UpsertProviderKeyDto,
  ) {
    return this.providerKeys.upsert(user.id, provider, dto.key);
  }

  @Delete(':provider')
  @HttpCode(200)
  @ApiOperation({ summary: 'Remove a provider API key' })
  remove(@CurrentUser() user: User, @Param('provider') provider: LLMProvider) {
    return this.providerKeys.remove(user.id, provider);
  }
}
