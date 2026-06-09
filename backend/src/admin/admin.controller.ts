import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, Req,
  UseGuards, ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsEnum, IsString, IsBoolean, IsNumber, IsInt, IsNotEmpty, IsOptional } from 'class-validator';
import { Plan }          from '@prisma/client';
import { Request }       from 'express';
import { AdminService }    from './admin.service';
import { BillingService, CreateBillingProductInput } from '../billing/billing.service';
import { AdminJwtGuard }   from '../admin-auth/guards/admin-jwt.guard';
import { AdminRolesGuard } from '../admin-auth/guards/admin-roles.guard';
import { AdminRoles }      from '../admin-auth/decorators/admin-roles.decorator';
import { GetAdminUser }    from '../admin-auth/decorators/admin-user.decorator';
import { AuditService }    from '../audit/audit.service';
import type { AdminUser }  from '@prisma/client';

class UpdatePlanDto   { @IsEnum(Plan)              @IsNotEmpty()             plan!:    Plan;   }
class ReplyDto         { @IsString()                @IsNotEmpty()             body!:    string; }
class UpdateStatusDto  { @IsString()                @IsNotEmpty() @IsOptional() status?: string; }
class NoteDto          { @IsString()                @IsNotEmpty()             body!:    string; }

class UpdateBillingConfigDto {
  @IsInt()      @IsOptional() trialDays?:            number;
  @IsNumber()   @IsOptional() paygRateProUsd?:       number;
  @IsNumber()   @IsOptional() paygRateFreeUsd?:      number;
  @IsInt()      @IsOptional() managedMarkupPercent?: number;
}

class CreateBillingProductDto implements CreateBillingProductInput {
  @IsString()   @IsNotEmpty()  name!:           string;
  @IsString()   @IsOptional()  description?:    string | null;
  @IsString()   @IsOptional()  stripeProductId?: string | null;
  @IsString()   @IsOptional()  stripePriceId?:  string | null; // omit to auto-create in Stripe
  @IsEnum(Plan) @IsOptional()  planType?:       Plan;
  @IsString()   @IsOptional()  interval?:       string;
  @IsInt()                     amountCents!:    number;
  @IsString()   @IsOptional()  currency?:       string;
  @IsBoolean()  @IsOptional()  isPublic?:       boolean;
  @IsBoolean()  @IsOptional()  isActive?:       boolean;
  @IsInt()      @IsOptional()  trialDays?:      number | null;
  @IsString()   @IsOptional()  notes?:          string | null;
}

class AssignCustomPlanDto {
  @IsString()  @IsNotEmpty()  userId!:    string;
  @IsString()  @IsNotEmpty()  productId!: string;
  @IsString()  @IsOptional()  notes?:     string;
}
class SendEmailDto     {
  @IsString() @IsNotEmpty() subject!: string;
  @IsString() @IsNotEmpty() body!:    string;
}

@ApiTags('admin')
@Controller('admin')
@UseGuards(AdminJwtGuard)
@ApiBearerAuth('jwt')
export class AdminController {
  constructor(
    private readonly admin:   AdminService,
    private readonly audit:   AuditService,
    private readonly billing: BillingService,
  ) {}

  // ── Analytics ──────────────────────────────────────────────────────────────

  @Get('analytics')
  @ApiOperation({ summary: 'Platform analytics overview' })
  analytics() {
    return this.admin.getAnalytics();
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
  @UseGuards(AdminRolesGuard)
  @AdminRoles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Override a user plan (SUPER_ADMIN, ADMIN)' })
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

  // ── CRM notes ─────────────────────────────────────────────────────────────

  @Post('users/:id/notes')
  @ApiOperation({ summary: 'Add a CRM note to a user' })
  async addNote(
    @Param('id') id: string, @Body() dto: NoteDto,
    @GetAdminUser() admin: AdminUser, @Req() req: Request,
  ) {
    const result = await this.admin.addNote(id, admin.id, dto.body);
    await this.audit.log({ adminId: admin.id, resource: 'user', resourceId: id, action: 'user.note_added', req });
    return result;
  }

  @Get('users/:id/notes')
  @ApiOperation({ summary: 'Get CRM notes for a user' })
  getNotes(@Param('id') id: string) {
    return this.admin.getNotes(id);
  }

  @Delete('users/:userId/notes/:noteId')
  @ApiOperation({ summary: 'Delete a CRM note' })
  async deleteNote(
    @Param('userId') userId: string, @Param('noteId') noteId: string,
    @GetAdminUser() admin: AdminUser, @Req() req: Request,
  ) {
    const result = await this.admin.deleteNote(noteId);
    await this.audit.log({ adminId: admin.id, resource: 'user', resourceId: userId, action: 'user.note_deleted', req });
    return result;
  }

  // ── Admin custom email ────────────────────────────────────────────────────

  @Post('users/:id/email')
  @ApiOperation({ summary: 'Send a custom email to a user from admin' })
  async sendEmail(
    @Param('id') id: string, @Body() dto: SendEmailDto,
    @GetAdminUser() admin: AdminUser, @Req() req: Request,
  ) {
    const result = await this.admin.sendCustomEmail(id, admin.name, dto.subject, dto.body);
    await this.audit.log({ adminId: admin.id, resource: 'user', resourceId: id,
      action: 'user.email_sent', metadata: { subject: dto.subject }, req });
    return result;
  }

  // ── Accounting (full) ─────────────────────────────────────────────────────

  @Get('accounting')
  @UseGuards(AdminRolesGuard)
  @AdminRoles('SUPER_ADMIN', 'ADMIN', 'ANALYST')
  @ApiOperation({ summary: 'Full accounting & revenue summary (SUPER_ADMIN, ADMIN, ANALYST)' })
  accounting() {
    return this.admin.getFullAccounting();
  }

  // ── Audit log ──────────────────────────────────────────────────────────────

  @Get('audit')
  @UseGuards(AdminRolesGuard)
  @AdminRoles('SUPER_ADMIN', 'ADMIN', 'ANALYST')
  @ApiOperation({ summary: 'Query audit log' })
  auditLog(
    @Query('resource')  resource?:  string,
    @Query('action')    action?:    string,
    @Query('adminId')   adminId?:   string,
    @Query('userId')    userId?:    string,
    @Query('from')      from?:      string,
    @Query('to')        to?:        string,
    @Query('page',  new DefaultValuePipe(1),  ParseIntPipe) page  = 1,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit = 50,
  ) {
    return this.audit.query({
      resource, action, adminId, userId, page, limit,
      from: from ? new Date(from) : undefined,
      to:   to   ? new Date(to)   : undefined,
    });
  }

  // ── Billing config ─────────────────────────────────────────────────────────

  @Get('billing/config')
  @UseGuards(AdminRolesGuard)
  @AdminRoles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Get billing config singleton' })
  getBillingConfig() {
    return this.billing.getConfig();
  }

  @Patch('billing/config')
  @UseGuards(AdminRolesGuard)
  @AdminRoles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Update billing config' })
  updateBillingConfig(@Body() body: UpdateBillingConfigDto) {
    return this.billing.updateBillingConfig(body);
  }

  // ── Billing products ───────────────────────────────────────────────────────

  @Get('billing/products')
  @UseGuards(AdminRolesGuard)
  @AdminRoles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'List all billing products (admin)' })
  listBillingProducts() {
    return this.billing.listAdminProducts();
  }

  @Post('billing/products')
  @UseGuards(AdminRolesGuard)
  @AdminRoles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Create a new billing product' })
  createBillingProduct(@Body() body: CreateBillingProductDto, @GetAdminUser() admin: AdminUser) {
    return this.billing.createBillingProduct(body, admin.id);
  }

  @Patch('billing/products/:id/toggle')
  @UseGuards(AdminRolesGuard)
  @AdminRoles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Activate or deactivate a billing product' })
  toggleBillingProduct(@Param('id') id: string, @Body() body: { isActive: boolean }) {
    return this.billing.toggleBillingProduct(id, body.isActive);
  }

  // ── Custom plan assignments ────────────────────────────────────────────────

  @Get('billing/assignments')
  @UseGuards(AdminRolesGuard)
  @AdminRoles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'List all custom plan assignments' })
  listAssignments() {
    return this.billing.listCustomAssignments();
  }

  @Post('billing/assignments')
  @UseGuards(AdminRolesGuard)
  @AdminRoles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Assign a custom plan to a user' })
  assignCustomPlan(@Body() body: AssignCustomPlanDto, @GetAdminUser() admin: AdminUser) {
    return this.billing.assignCustomPlan(body.userId, body.productId, body.notes, admin.id);
  }

  @Delete('billing/assignments/:userId')
  @UseGuards(AdminRolesGuard)
  @AdminRoles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Remove custom plan assignment for a user' })
  removeAssignment(@Param('userId') userId: string) {
    return this.billing.removeCustomAssignment(userId);
  }
}
