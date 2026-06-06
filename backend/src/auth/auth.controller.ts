import { Controller, Post, Body, Get, UseGuards, HttpCode } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';
import { AuthService }  from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser }  from './decorators/current-user.decorator';
import { User }         from '@prisma/client';

class FirebaseAuthDto {
  @IsString() @IsNotEmpty()
  idToken!: string;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Exchange a Firebase ID token (from the frontend) for a GateML JWT.
   * The Firebase SDK handles all OAuth flows (Google, GitHub, Apple) in the browser;
   * this endpoint only needs the resulting ID token.
   */
  @Post('firebase')
  @HttpCode(200)
  @ApiOperation({ summary: 'Sign in with a Firebase ID token' })
  signInWithFirebase(@Body() body: FirebaseAuthDto) {
    return this.authService.signInWithFirebase(body.idToken);
  }

  /** Verify the current JWT and return the logged-in user's profile. */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('jwt')
  @ApiOperation({ summary: 'Get current user' })
  me(@CurrentUser() user: User) {
    return {
      id:        user.id,
      email:     user.email,
      name:      user.name,
      avatarUrl: user.avatarUrl,
      provider:  user.provider,
      createdAt: user.createdAt,
    };
  }
}
