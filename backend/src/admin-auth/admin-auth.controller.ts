import { Controller, Post, Get, Body, UseGuards, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsEmail, IsNotEmpty } from 'class-validator';
import { AdminAuthService } from './admin-auth.service';
import { AdminJwtGuard }    from './guards/admin-jwt.guard';
import { GetAdminUser }     from './decorators/admin-user.decorator';
import type { AdminUser }   from '@prisma/client';

class LoginDto {
  @IsEmail()    @IsNotEmpty() email!:    string;
  @IsString()  @IsNotEmpty() password!: string;
}

@ApiTags('admin-auth')
@Controller('admin/auth')
export class AdminAuthController {
  constructor(private readonly adminAuth: AdminAuthService) {}

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
    const { passwordHash: _, ...safe } = admin;
    return safe;
  }
}
