import { Controller, Post, Delete, Body, UseGuards, HttpCode } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';
import { User }                    from '@prisma/client';
import { NotificationsService }    from './notifications.service';
import { JwtAuthGuard }            from '../auth/guards/jwt-auth.guard';
import { CurrentUser }             from '../auth/decorators/current-user.decorator';

class RegisterTokenDto {
  @IsString() @IsNotEmpty()
  fcmToken!: string;
}

@ApiTags('notifications')
@ApiBearerAuth('jwt')
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Post('token')
  @HttpCode(200)
  @ApiOperation({ summary: 'Register FCM token for push notifications' })
  register(@CurrentUser() user: User, @Body() dto: RegisterTokenDto) {
    return this.notifications.registerToken(user.id, dto.fcmToken);
  }

  @Delete('token')
  @HttpCode(200)
  @ApiOperation({ summary: 'Unregister FCM token (call on logout)' })
  unregister(@CurrentUser() user: User) {
    return this.notifications.unregisterToken(user.id);
  }
}
