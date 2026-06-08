import {
  Controller, Get, Post, Patch, Body, Param, Query,
  UseGuards, ParseIntPipe, DefaultValuePipe, Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsInt, Min, Max, IsOptional, IsBoolean, IsDateString } from 'class-validator';
import { Type }          from 'class-transformer';
import { Request }       from 'express';
import { PromosService }   from './promos.service';
import { AdminJwtGuard }   from '../admin-auth/guards/admin-jwt.guard';
import { AdminRolesGuard } from '../admin-auth/guards/admin-roles.guard';
import { AdminRoles }      from '../admin-auth/decorators/admin-roles.decorator';
import { GetAdminUser }    from '../admin-auth/decorators/admin-user.decorator';
import { AuditService }    from '../audit/audit.service';
import type { AdminUser }  from '@prisma/client';

class CreatePromoDto {
  @IsString()  @IsNotEmpty()          code!:            string;
  @IsString()  @IsOptional()          description?:     string;
  @IsInt()     @Min(1) @Max(100) @Type(() => Number) discountPercent!: number;
  @IsInt()     @IsOptional() @Type(() => Number) maxUses?: number;
  @IsDateString() @IsOptional()       validUntil?:      string;
}

class TogglePromoDto {
  @IsBoolean() isActive!: boolean;
}

@ApiTags('admin/promos')
@Controller('admin/promos')
@UseGuards(AdminJwtGuard, AdminRolesGuard)
@AdminRoles('SUPER_ADMIN', 'ADMIN')
@ApiBearerAuth('jwt')
export class PromosController {
  constructor(
    private readonly promos: PromosService,
    private readonly audit:  AuditService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a promo code (also creates Stripe coupon)' })
  async create(
    @Body() dto: CreatePromoDto,
    @GetAdminUser() admin: AdminUser, @Req() req: Request,
  ) {
    const promo = await this.promos.create({
      code:            dto.code,
      description:     dto.description,
      discountPercent: dto.discountPercent,
      maxUses:         dto.maxUses,
      validUntil:      dto.validUntil ? new Date(dto.validUntil) : undefined,
      createdBy:       admin.id,
    });
    await this.audit.log({ adminId: admin.id, resource: 'promoCode', resourceId: promo.id,
      action: 'promo.created', metadata: { code: promo.code, discountPercent: promo.discountPercent }, req });
    return promo;
  }

  @Get()
  @ApiOperation({ summary: 'List promo codes' })
  list(
    @Query('page',  new DefaultValuePipe(1),  ParseIntPipe) page  = 1,
    @Query('limit', new DefaultValuePipe(25), ParseIntPipe) limit = 25,
  ) {
    return this.promos.list(page, limit);
  }

  @Get('validate/:code')
  @ApiOperation({ summary: 'Validate a promo code (public-safe — no sensitive data)' })
  validate(@Param('code') code: string) {
    return this.promos.validate(code);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a promo code' })
  get(@Param('id') id: string) {
    return this.promos.get(id);
  }

  @Patch(':id/toggle')
  @ApiOperation({ summary: 'Activate or deactivate a promo code' })
  async toggle(
    @Param('id') id: string, @Body() dto: TogglePromoDto,
    @GetAdminUser() admin: AdminUser, @Req() req: Request,
  ) {
    const result = await this.promos.toggle(id, dto.isActive);
    await this.audit.log({ adminId: admin.id, resource: 'promoCode', resourceId: id,
      action: `promo.${dto.isActive ? 'activated' : 'deactivated'}`, req });
    return result;
  }
}
