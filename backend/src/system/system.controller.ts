import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation }      from '@nestjs/swagger';
import { IsBoolean, IsString, IsArray, IsOptional } from 'class-validator';
import { SystemService }  from './system.service';
import { JwtAuthGuard }   from '../auth/guards/jwt-auth.guard';

class SetStatusDto {
  @IsBoolean()          operational!: boolean;
  @IsString()           message!: string;
  @IsArray() @IsOptional() affectedServices?: string[];
}

@ApiTags('system')
@Controller('system')
export class SystemController {
  constructor(private readonly system: SystemService) {}

  /** Update global system status (admin use — protect in production with role guard). */
  @Post('status')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update system status in Firestore (admin)' })
  setStatus(@Body() dto: SetStatusDto) {
    return this.system.setStatus(dto.operational, dto.message, dto.affectedServices ?? []);
  }

  /** Re-sync changelog entries to Firestore. */
  @Post('sync-changelog')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Re-sync changelog to Firestore (admin)' })
  syncChangelog() {
    return this.system.seedChangelog();
  }
}
