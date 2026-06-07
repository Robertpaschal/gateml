import {
  Controller, Get, Patch, Body, Param, Query, Req,
  UseGuards, ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsEnum, IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { Plan }          from '@prisma/client';
import { Request }       from 'express';
import { AdminService }  from './admin.service';
import { AdminJwtGuard } from '../admin-auth/guards/admin-jwt.guard';
import { GetAdminUser }  from '../admin-auth/decorators/admin-user.decorator';
import { AuditService }  from '../audit/audit.service';
import type { AdminUser } from '@prisma/client';

class UpdatePlanDto { @IsEnum(Plan)                          plan!:   Plan;   }
class ReplyDto       { @IsString() @IsNotEmpty()             body!:   string; }
class UpdateStatusDto{ @IsString() @IsNotEmpty() @IsOptional() status?: string; }

@ApiTags('admin')
@Controller('admin')
@UseGuards(AdminJwtGuard)
@ApiBearerAuth('jwt')
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly audit: AuditService,
  ) {}

  // ── Analytics ──────────────────────────────────────────────────────────────

  @Get('analytics')
  @ApiOperation({ summary: 'Platform analytics overview' })
  analytics() {
    return this.admin.getAnalytics();
  }

  // ── Accounting ────────────────────────────────────────────────────────────

  @Get('accounting')
  @ApiOperation({ summary: 'Revenue and billing summary (Stripe + managed usage)' })
  accounting() {
    return this.admin.getAccounting();
  }

  // ── Users ──────────────────────────────────────────────────────────────────

  @Get('users')
  @ApiOperation({ summary: 'List all users (paginated, searchable)' })
  listUsers(
    @Query('search') search?: string,
    @Query('page',  new DefaultValuePipe(1),  ParseIntPipe) page  = 1,
    @Query('limit', new DefaultValuePipe(25), ParseIntPipe) limit = 25,
  ) {
    return this.admin.listUsers(search, page, limit);
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get a single user with logs and usage' })
  getUser(@Param('id') id: string) {
    return this.admin.getUser(id);
  }

  @Patch('users/:id/plan')
  @ApiOperation({ summary: 'Override a user plan' })
  async updatePlan(
    @Param('id') id: string, @Body() body: UpdatePlanDto,
    @GetAdminUser() admin: AdminUser, @Req() req: Request,
  ) {
    const result = await this.admin.updateUserPlan(id, body.plan);
    await this.audit.log({ adminId: admin.id, resource: 'user', resourceId: id,
      action: 'user.plan_changed', metadata: { plan: body.plan }, req });
    return result;
  }

  // ── Support messages ───────────────────────────────────────────────────────

  @Get('messages')
  @ApiOperation({ summary: 'List support messages (filterable by status and category)' })
  listMessages(
    @Query('status')   status?:   string,
    @Query('category') category?: string,
    @Query('page',  new DefaultValuePipe(1),  ParseIntPipe) page  = 1,
    @Query('limit', new DefaultValuePipe(25), ParseIntPipe) limit = 25,
  ) {
    return this.admin.listMessages(status, category, page, limit);
  }

  @Get('messages/:id')
  @ApiOperation({ summary: 'Get a single support message' })
  getMessage(@Param('id') id: string) {
    return this.admin.getMessage(id);
  }

  @Patch('messages/:id/reply')
  @ApiOperation({ summary: 'Reply to a support message (sends email)' })
  async reply(
    @Param('id') id: string, @Body() body: ReplyDto,
    @GetAdminUser() admin: AdminUser, @Req() req: Request,
  ) {
    const result = await this.admin.replyToMessage(id, body.body);
    await this.audit.log({ adminId: admin.id, resource: 'contactMessage', resourceId: id,
      action: 'message.replied', req });
    return result;
  }

  @Patch('messages/:id/status')
  @ApiOperation({ summary: 'Update message status' })
  async updateStatus(
    @Param('id') id: string, @Body() body: UpdateStatusDto,
    @GetAdminUser() admin: AdminUser, @Req() req: Request,
  ) {
    const result = await this.admin.updateMessageStatus(id, body.status!);
    await this.audit.log({ adminId: admin.id, resource: 'contactMessage', resourceId: id,
      action: 'message.status_changed', metadata: { status: body.status }, req });
    return result;
  }

  // ── Audit log ──────────────────────────────────────────────────────────────

  @Get('audit')
  @ApiOperation({ summary: 'Query audit log' })
  auditLog(
    @Query('resource')  resource?:  string,
    @Query('action')    action?:    string,
    @Query('adminId')   adminId?:   string,
    @Query('userId')    userId?:    string,
    @Query('page',  new DefaultValuePipe(1),  ParseIntPipe) page  = 1,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit = 50,
  ) {
    return this.audit.query({ resource, action, adminId, userId, page, limit });
  }
}
