import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { User }            from '@prisma/client';
import { PromptsService }  from './prompts.service';
import { JwtAuthGuard }    from '../auth/guards/jwt-auth.guard';
import { CurrentUser }     from '../auth/decorators/current-user.decorator';

class CreatePromptDto {
  @IsString() @IsNotEmpty() name!: string;
  @IsString() @IsOptional() model?: string;
}

class CreateVersionDto {
  @IsString() @IsNotEmpty() body!: string;
  @IsString() @IsOptional() note?: string;
}

@ApiTags('prompts')
@ApiBearerAuth('jwt')
@UseGuards(JwtAuthGuard)
@Controller('prompts')
export class PromptsController {
  constructor(private readonly prompts: PromptsService) {}

  @Get()
  @ApiOperation({ summary: 'List all prompts with their latest version' })
  list(@CurrentUser() user: User) { return this.prompts.list(user.id); }

  @Get(':id')
  @ApiOperation({ summary: 'Get a prompt with all versions' })
  get(@CurrentUser() user: User, @Param('id') id: string) {
    return this.prompts.getWithVersions(id, user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new prompt' })
  create(@CurrentUser() user: User, @Body() dto: CreatePromptDto) {
    return this.prompts.create(user.id, dto.name, dto.model ?? 'gpt-4o');
  }

  @Post(':id/versions')
  @ApiOperation({ summary: 'Add a new version to an existing prompt' })
  addVersion(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: CreateVersionDto,
  ) { return this.prompts.createVersion(id, user.id, dto.body, dto.note ?? ''); }

  @Post(':id/versions/:versionId/activate')
  @ApiOperation({ summary: 'Set a version as live / active' })
  activate(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Param('versionId') versionId: string,
  ) { return this.prompts.setActive(id, versionId, user.id); }
}
