import { Controller, Post, Body, UseGuards, HttpCode } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsString, IsEmail, IsNotEmpty, IsOptional, MaxLength, IsEnum } from 'class-validator';
import { SupportService }   from './support.service';
import { JwtAuthGuard }     from '../auth/guards/jwt-auth.guard';
import { CurrentUser }      from '../auth/decorators/current-user.decorator';
import { ContactCategory }  from '@prisma/client';
import { User }             from '@prisma/client';

class ContactDto {
  @IsString()  @IsNotEmpty() @MaxLength(120)  subject!:  string;
  @IsString()  @IsNotEmpty() @MaxLength(5000) body!:     string;
}

class PublicContactDto {
  @IsEmail()                                  email!:    string;
  @IsString()  @IsNotEmpty() @MaxLength(80)   name!:     string;
  @IsString()  @IsOptional() @MaxLength(120)  company?:  string;
  @IsString()  @IsNotEmpty() @MaxLength(120)  subject!:  string;
  @IsString()  @IsNotEmpty() @MaxLength(5000) body!:     string;
  @IsEnum(ContactCategory) @IsOptional()      category?: ContactCategory;
}

@ApiTags('support')
@Controller('support')
export class SupportController {
  constructor(private readonly support: SupportService) {}

  /** Authenticated user submits a support ticket from the dashboard. */
  @Post('contact')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('jwt')
  @ApiOperation({ summary: 'Submit a support message (authenticated)' })
  contact(@CurrentUser() user: User, @Body() body: ContactDto) {
    return this.support.submitContact(
      user.id,
      user.email,
      user.name ?? user.email.split('@')[0],
      body.subject,
      body.body,
      ContactCategory.SUPPORT,
    );
  }

  /**
   * Public contact form — no auth required.
   * Used by the marketing site for Enterprise leads, general inquiries, etc.
   * Rate limiting should be applied at the infra level (nginx / AWS WAF).
   */
  @Post('public')
  @HttpCode(200)
  @ApiOperation({ summary: 'Public contact form (no auth required)' })
  publicContact(@Body() body: PublicContactDto) {
    return this.support.submitPublicContact(
      body.email,
      body.name,
      body.subject,
      body.body,
      body.category ?? ContactCategory.GENERAL,
      body.company,
    );
  }
}
