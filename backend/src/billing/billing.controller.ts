import {
  Controller, Get, Post, Body, UseGuards,
  Headers, RawBodyRequest, Req, HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsString, IsBoolean, IsNotEmpty } from 'class-validator';
import { Request }        from 'express';
import { BillingService } from './billing.service';
import { JwtAuthGuard }   from '../auth/guards/jwt-auth.guard';
import { CurrentUser }    from '../auth/decorators/current-user.decorator';
import { User }           from '@prisma/client';
import { ConfigService }  from '@nestjs/config';

class CheckoutDto {
  @IsString() @IsNotEmpty()
  priceId!: string;
}

class TogglePaygDto {
  @IsBoolean()
  enabled!: boolean;
}

class ToggleManagedDto {
  @IsBoolean()
  enabled!: boolean;
}

@ApiTags('billing')
@Controller('billing')
export class BillingController {
  constructor(
    private readonly billing: BillingService,
    private readonly config:  ConfigService,
  ) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('jwt')
  @ApiOperation({ summary: 'Get current plan, usage, and managed-mode status' })
  me(@CurrentUser() user: User) {
    return this.billing.getMe(user.id);
  }

  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('jwt')
  @ApiOperation({ summary: 'Create a Stripe checkout session' })
  checkout(@CurrentUser() user: User, @Body() body: CheckoutDto) {
    const appUrl = this.config.get<string>('APP_URL') ?? 'http://localhost:3000';
    return this.billing.createCheckoutSession(
      user.id,
      body.priceId,
      `${appUrl}/dashboard/billing?success=1`,
      `${appUrl}/dashboard/billing?canceled=1`,
    );
  }

  @Post('portal')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('jwt')
  @ApiOperation({ summary: 'Create a Stripe billing portal session' })
  portal(@CurrentUser() user: User) {
    const appUrl = this.config.get<string>('APP_URL') ?? 'http://localhost:3000';
    return this.billing.createPortalSession(user.id, `${appUrl}/dashboard/billing`);
  }

  @Post('webhook')
  @HttpCode(200)
  @ApiOperation({ summary: 'Stripe webhook receiver (no auth)' })
  webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') sig: string,
  ) {
    return this.billing.handleWebhook(req.rawBody!, sig);
  }

  @Post('payg')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('jwt')
  @ApiOperation({ summary: 'Toggle pay-as-you-go for over-quota requests' })
  togglePayg(@CurrentUser() user: User, @Body() body: TogglePaygDto) {
    return this.billing.togglePayAsYouGo(user.id, body.enabled);
  }

  @Post('managed')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('jwt')
  @ApiOperation({ summary: 'Toggle GateML Managed Keys — use GateML provider keys instead of BYOK' })
  toggleManaged(@CurrentUser() user: User, @Body() body: ToggleManagedDto) {
    return this.billing.toggleManaged(user.id, body.enabled);
  }
}
