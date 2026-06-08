import {
  Controller, Post, Get, Patch, Delete, Body, Param,
  UseGuards, HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsEmail, IsNotEmpty }  from 'class-validator';
import { AdminAuthService }               from './admin-auth.service';
import { AdminJwtGuard }                  from './guards/admin-jwt.guard';
import { GetAdminUser }                   from './decorators/admin-user.decorator';
import { InviteAdminDto }                 from './dto/invite-admin.dto';
import { AcceptInviteDto }                from './dto/accept-invite.dto';
import { BootstrapAdminDto }              from './dto/bootstrap-admin.dto';
import type { AdminUser }                 from '@prisma/client';

class LoginDto {
  @IsEmail()  @IsNotEmpty() email!:    string;
  @IsString() @IsNotEmpty() password!: string;
}

class ChangePasswordDto {
  @IsString() @IsNotEmpty() currentPassword!: string;
  @IsString() @IsNotEmpty() newPassword!:     string;
}

class AddDomainDto {
  @IsString() @IsNotEmpty() domain!: string;
}

@ApiTags('admin-auth')
@Controller('admin/auth')
export class AdminAuthController {
  constructor(private readonly adminAuth: AdminAuthService) {}

  // ── Login ──────────────────────────────────────────────────────────────────

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Admin email/password login' })
  login(@Body() body: LoginDto) {
    return this.adminAuth.login(body.email, body.password);
  }

  @Get('me')
  @UseGuards(AdminJwtGuard)
  @ApiBearerAuth('jwt')
  @ApiOperation({ summary: 'Get current admin user' })
  me(@GetAdminUser() admin: AdminUser) {
    const { passwordHash: _, inviteToken: __, ...safe } = admin;
    return safe;
  }

  // ── Bootstrap (first admin) ────────────────────────────────────────────────

  @Post('bootstrap')
  @ApiOperation({ summary: 'Create the first admin when zero admins exist (one-time use)' })
  bootstrap(@Body() dto: BootstrapAdminDto) {
    return this.adminAuth.bootstrap(dto.email, dto.name);
  }

  // ── Invite flow ────────────────────────────────────────────────────────────

  @Post('invite')
  @UseGuards(AdminJwtGuard)
  @ApiBearerAuth('jwt')
  @ApiOperation({ summary: 'Invite a new admin (SUPER_ADMIN only)' })
  invite(@GetAdminUser() admin: AdminUser, @Body() dto: InviteAdminDto) {
    return this.adminAuth.invite(admin.id, dto.email, dto.name, dto.role);
  }

  @Get('invite/:token')
  @ApiOperation({ summary: 'Validate invite token and return email + role' })
  getInvite(@Param('token') token: string) {
    return this.adminAuth.getInvite(token);
  }

  @Post('accept-invite')
  @HttpCode(200)
  @ApiOperation({ summary: 'Accept invite and set password — activates account' })
  acceptInvite(@Body() dto: AcceptInviteDto) {
    return this.adminAuth.acceptInvite(dto.token, dto.password);
  }

  // ── Change password ────────────────────────────────────────────────────────

  @Post('change-password')
  @UseGuards(AdminJwtGuard)
  @ApiBearerAuth('jwt')
  @HttpCode(200)
  @ApiOperation({ summary: 'Change own admin password (invalidates other sessions)' })
  changePassword(@GetAdminUser() admin: AdminUser, @Body() dto: ChangePasswordDto) {
    return this.adminAuth.changePassword(admin.id, dto.currentPassword, dto.newPassword);
  }

  // ── Admin user management ──────────────────────────────────────────────────

  @Get('admins')
  @UseGuards(AdminJwtGuard)
  @ApiBearerAuth('jwt')
  @ApiOperation({ summary: 'List all admin users (SUPER_ADMIN only)' })
  listAdmins() {
    return this.adminAuth.listAdmins();
  }

  @Patch('admins/:id/deactivate')
  @UseGuards(AdminJwtGuard)
  @ApiBearerAuth('jwt')
  @ApiOperation({ summary: 'Deactivate an admin (SUPER_ADMIN only)' })
  deactivate(@GetAdminUser() admin: AdminUser, @Param('id') targetId: string) {
    return this.adminAuth.deactivate(admin.id, targetId);
  }

  @Patch('admins/:id/reactivate')
  @UseGuards(AdminJwtGuard)
  @ApiBearerAuth('jwt')
  @ApiOperation({ summary: 'Reactivate a deactivated admin (SUPER_ADMIN only)' })
  reactivate(@GetAdminUser() admin: AdminUser, @Param('id') targetId: string) {
    return this.adminAuth.reactivate(admin.id, targetId);
  }

  // ── Domain allowlist ───────────────────────────────────────────────────────

  @Get('domains')
  @UseGuards(AdminJwtGuard)
  @ApiBearerAuth('jwt')
  @ApiOperation({ summary: 'List allowed admin email domains' })
  listDomains() {
    return this.adminAuth.listAllowedDomains();
  }

  @Post('domains')
  @UseGuards(AdminJwtGuard)
  @ApiBearerAuth('jwt')
  @ApiOperation({ summary: 'Add an allowed admin email domain (SUPER_ADMIN only)' })
  addDomain(@Body() dto: AddDomainDto) {
    return this.adminAuth.addAllowedDomain(dto.domain);
  }

  @Delete('domains/:domain')
  @UseGuards(AdminJwtGuard)
  @ApiBearerAuth('jwt')
  @ApiOperation({ summary: 'Remove an allowed admin email domain (SUPER_ADMIN only)' })
  removeDomain(@Param('domain') domain: string) {
    return this.adminAuth.removeAllowedDomain(domain);
  }
}
