import { Controller, Get, Post, Delete, Param, Body, UseGuards, HttpCode } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum }  from 'class-validator';
import { KeyType, User }                 from '@prisma/client';
import { ApiKeysService }   from './api-keys.service';
import { JwtAuthGuard }     from '../auth/guards/jwt-auth.guard';
import { CurrentUser }      from '../auth/decorators/current-user.decorator';

class CreateApiKeyDto {
  @IsString() @IsNotEmpty() name!: string;
  @IsEnum(KeyType)          type!: KeyType;
}

@ApiTags('api-keys')
@ApiBearerAuth('jwt')
@UseGuards(JwtAuthGuard)
@Controller('keys')
export class ApiKeysController {
  constructor(private readonly apiKeys: ApiKeysService) {}

  @Get()
  @ApiOperation({ summary: 'List active API keys (key value masked)' })
  list(@CurrentUser() user: User) {
    return this.apiKeys.list(user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new API key (full value returned once)' })
  create(@CurrentUser() user: User, @Body() dto: CreateApiKeyDto) {
    return this.apiKeys.create(user.id, dto.name, dto.type);
  }

  @Delete(':id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Revoke an API key' })
  revoke(@CurrentUser() user: User, @Param('id') id: string) {
    return this.apiKeys.revoke(id, user.id);
  }
}
