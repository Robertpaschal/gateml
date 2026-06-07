import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsBoolean, IsString, IsArray, IsOptional, IsNumber, IsNotEmpty } from 'class-validator';
import { SystemService }  from './system.service';
import { AdminJwtGuard }  from '../admin-auth/guards/admin-jwt.guard';

class SetStatusDto {
  @IsBoolean()             operational!: boolean;
  @IsString()              message!: string;
  @IsArray() @IsOptional() affectedServices?: string[];
}

class UpsertChangelogDto {
  @IsString()  @IsNotEmpty() id!:      string;   // Firestore doc key, e.g. "v0.4.0"
  @IsString()  @IsNotEmpty() version!: string;
  @IsString()  @IsNotEmpty() date!:    string;
  @IsString()  @IsNotEmpty() title!:   string;
  @IsString()  @IsNotEmpty() tag!:     string;   // "new" | "fix" | "launch"
  @IsArray()                 changes!: string[];
  @IsNumber()                order!:   number;   // Lower = newer (1 = latest)
}

@ApiTags('system')
@Controller('system')
export class SystemController {
  constructor(private readonly system: SystemService) {}

  /** Update global system status — requires admin JWT. */
  @Post('status')
  @UseGuards(AdminJwtGuard)
  @ApiBearerAuth('jwt')
  @ApiOperation({ summary: 'Update system status in Firestore (admin only)' })
  setStatus(@Body() dto: SetStatusDto) {
    return this.system.setStatus(dto.operational, dto.message, dto.affectedServices ?? []);
  }

  /** Re-seed all hardcoded changelog entries to Firestore — requires admin JWT. */
  @Post('sync-changelog')
  @UseGuards(AdminJwtGuard)
  @ApiBearerAuth('jwt')
  @ApiOperation({ summary: 'Re-sync all changelog entries to Firestore (admin only)' })
  syncChangelog() {
    return this.system.seedChangelog();
  }

  /** Add or update a single changelog entry — requires admin JWT. */
  @Post('changelog')
  @UseGuards(AdminJwtGuard)
  @ApiBearerAuth('jwt')
  @ApiOperation({ summary: 'Upsert a changelog entry in Firestore (admin only)' })
  upsertChangelog(@Body() dto: UpsertChangelogDto) {
    const { id, ...entry } = dto;
    return this.system.upsertEntry(id, entry);
  }
}
