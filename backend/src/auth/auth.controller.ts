import { Controller, Post, Body, Get, UseGuards, HttpCode } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsString, IsNotEmpty }  from 'class-validator';
import { AuthService }           from './auth.service';
import { BillingService }        from '../billing/billing.service';
import { JwtAuthGuard }          from './guards/jwt-auth.guard';
import { CurrentUser }           from './decorators/current-user.decorator';
import { User }                  from '@prisma/client';
import { RegisterDto }           from './dto/register.dto';
import { LocalLoginDto }         from './dto/local-login.dto';
import { VerifyEmailDto }        from './dto/verify-email.dto';
import { ForgotPasswordDto }     from './dto/forgot-password.dto';
import { ResetPasswordDto }      from './dto/reset-password.dto';

class FirebaseAuthDto {
  @IsString() @IsNotEmpty()
  idToken!: string;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly billing:     BillingService,
  ) {}

  // ── Firebase (OAuth) ──────────────────────────────────────────────────────

  @Post('firebase')
  @HttpCode(200)
  @ApiOperation({ summary: 'Sign in with a Firebase ID token (Google / GitHub / Apple)' })
  signInWithFirebase(@Body() body: FirebaseAuthDto) {
    return this.authService.signInWithFirebase(body.idToken);
  }

  // ── In-house email / password ─────────────────────────────────────────────

  @Post('register')
  @ApiOperation({ summary: 'Create account with email + password' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Sign in with email + password' })
  localLogin(@Body() dto: LocalLoginDto) {
    return this.authService.localLogin(dto.email, dto.password);
  }

  @Post('verify-email')
  @HttpCode(200)
  @ApiOperation({ summary: 'Verify email with token from the link' })
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto.token);
  }

  @Post('resend-verification')
  @HttpCode(200)
  @ApiOperation({ summary: 'Resend email verification link' })
  resendVerification(@Body() dto: ForgotPasswordDto) {
    return this.authService.resendVerification(dto.email);
  }

  @Post('forgot-password')
  @HttpCode(200)
  @ApiOperation({ summary: 'Request a password reset email' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('reset-password')
  @HttpCode(200)
  @ApiOperation({ summary: 'Reset password with token from email' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.password);
  }

  // ── Session ───────────────────────────────────────────────────────────────

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('jwt')
  @ApiOperation({ summary: 'Get current user profile + usage' })
  async me(@CurrentUser() user: User) {
    const { usage } = await this.billing.getMe(user.id);
    const lim       = this.billing.limits(user.plan);
    return {
      id:            user.id,
      email:         user.email,
      name:          user.name,
      avatarUrl:     user.avatarUrl,
      provider:      user.provider,
      emailVerified: user.emailVerified,
      createdAt:     user.createdAt,
      plan:          user.plan,
      payAsYouGo:    user.payAsYouGo,
      usage:         { requests: usage.requests, limit: lim.liveRequestsPerMonth },
    };
  }
}
