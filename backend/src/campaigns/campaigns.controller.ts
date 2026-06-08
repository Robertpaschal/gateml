import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  UseGuards, ParseIntPipe, DefaultValuePipe, Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import {
  IsString, IsNotEmpty, IsOptional, IsEnum, IsDateString,
} from 'class-validator';
import { Request }          from 'express';
import { CampaignTarget }   from '@prisma/client';
import { CampaignsService } from './campaigns.service';
import { AdminJwtGuard }    from '../admin-auth/guards/admin-jwt.guard';
import { AdminRolesGuard }  from '../admin-auth/guards/admin-roles.guard';
import { AdminRoles }       from '../admin-auth/decorators/admin-roles.decorator';
import { GetAdminUser }     from '../admin-auth/decorators/admin-user.decorator';
import { AuditService }     from '../audit/audit.service';
import type { AdminUser }   from '@prisma/client';

class CreateCampaignDto {
  @IsString() @IsNotEmpty()         title!:       string;
  @IsString() @IsNotEmpty()         subject!:     string;
  @IsString() @IsNotEmpty()         body!:        string;
  @IsEnum(CampaignTarget) @IsOptional() target?:  CampaignTarget;
  @IsDateString()         @IsOptional() scheduledAt?: string;
}

class UpdateCampaignDto {
  @IsString() @IsOptional() title?:       string;
  @IsString() @IsOptional() subject?:     string;
  @IsString() @IsOptional() body?:        string;
  @IsEnum(CampaignTarget) @IsOptional() target?: CampaignTarget;
  @IsDateString()         @IsOptional() scheduledAt?: string | null;
}

@ApiTags('admin/campaigns')
@Controller('admin/campaigns')
@UseGuards(AdminJwtGuard, AdminRolesGuard)
@AdminRoles('SUPER_ADMIN', 'ADMIN')
@ApiBearerAuth('jwt')
export class CampaignsController {
  constructor(
    private readonly campaigns: CampaignsService,
    private readonly audit:     AuditService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new email campaign' })
  async create(
    @Body() dto: CreateCampaignDto,
    @GetAdminUser() admin: AdminUser, @Req() req: Request,
  ) {
    const campaign = await this.campaigns.create({
      title:       dto.title,
      subject:     dto.subject,
      body:        dto.body,
      target:      dto.target ?? 'ALL',
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
      createdBy:   admin.id,
    });
    await this.audit.log({ adminId: admin.id, resource: 'campaign', resourceId: campaign.id,
      action: 'campaign.created', metadata: { title: dto.title }, req });
    return campaign;
  }

  @Get()
  @ApiOperation({ summary: 'List campaigns (paginated)' })
  list(
    @Query('page',  new DefaultValuePipe(1),  ParseIntPipe) page  = 1,
    @Query('limit', new DefaultValuePipe(25), ParseIntPipe) limit = 25,
  ) {
    return this.campaigns.list(page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a campaign' })
  get(@Param('id') id: string) {
    return this.campaigns.get(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a draft campaign' })
  async update(
    @Param('id') id: string, @Body() dto: UpdateCampaignDto,
    @GetAdminUser() admin: AdminUser, @Req() req: Request,
  ) {
    const result = await this.campaigns.update(id, {
      ...dto,
      scheduledAt: dto.scheduledAt === null ? null : (dto.scheduledAt ? new Date(dto.scheduledAt) : undefined),
    });
    await this.audit.log({ adminId: admin.id, resource: 'campaign', resourceId: id, action: 'campaign.updated', req });
    return result;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a campaign' })
  async remove(
    @Param('id') id: string,
    @GetAdminUser() admin: AdminUser, @Req() req: Request,
  ) {
    const result = await this.campaigns.delete(id);
    await this.audit.log({ adminId: admin.id, resource: 'campaign', resourceId: id, action: 'campaign.deleted', req });
    return result;
  }

  @Post(':id/send')
  @ApiOperation({ summary: 'Send a campaign immediately to target audience' })
  async send(
    @Param('id') id: string,
    @GetAdminUser() admin: AdminUser, @Req() req: Request,
  ) {
    const result = await this.campaigns.send(id);
    await this.audit.log({ adminId: admin.id, resource: 'campaign', resourceId: id,
      action: 'campaign.sent', metadata: { queued: result.queued }, req });
    return result;
  }
}
