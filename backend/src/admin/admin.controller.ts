import {
  Controller, Get, Patch, Body, Param, Query,
  UseGuards, ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsEnum, IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { Plan } from '@prisma/client';
import { AdminService }  from './admin.service';
import { AdminJwtGuard } from '../admin-auth/guards/admin-jwt.guard';

class UpdatePlanDto {
  @IsEnum(Plan) plan!: Plan;
}

class ReplyDto {
  @IsString() @IsNotEmpty() body!: string;
}

class UpdateStatusDto {
  @IsString() @IsNotEmpty() @IsOptional() status?: string;
}

@ApiTags('admin')
@Controller('admin')
@UseGuards(AdminJwtGuard)
@ApiBearerAuth('jwt')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

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
  @ApiOperation({ summary: 'Override a user plan' })
  updatePlan(@Param('id') id: string, @Body() body: UpdatePlanDto) {
    return this.admin.updateUserPlan(id, body.plan);
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
  reply(@Param('id') id: string, @Body() body: ReplyDto) {
    return this.admin.replyToMessage(id, body.body);
  }

  @Patch('messages/:id/status')
  @ApiOperation({ summary: 'Update message status' })
  updateStatus(@Param('id') id: string, @Body() body: UpdateStatusDto) {
    return this.admin.updateMessageStatus(id, body.status!);
  }
}
