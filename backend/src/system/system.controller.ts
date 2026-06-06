import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation }      from '@nestjs/swagger';
import { IsBoolean, IsString, IsArray, IsOptional, IsNumber, IsNotEmpty } from 'class-validator';
import { SystemService }  from './system.service';
import { JwtAuthGuard }   from '../auth/guards/jwt-auth.guard';

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

  /** Update global system status (admin — protect with role guard in production). */
  @Post('status')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update system status in Firestore (admin)' })
  setStatus(@Body() dto: SetStatusDto) {
    return this.system.setStatus(dto.operational, dto.message, dto.affectedServices ?? []);
  }

  /** Re-seed all hardcoded changelog entries to Firestore. */
  @Post('sync-changelog')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Re-sync all changelog entries to Firestore (admin)' })
  syncChangelog() {
    return this.system.seedChangelog();
  }

  /**
   * Add or update a single changelog entry — no redeploy needed.
   * The `id` field is the Firestore document key (e.g. "v0.4.0").
   */
  @Post('changelog')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Upsert a changelog entry in Firestore (admin)' })
  upsertChangelog(@Body() dto: UpsertChangelogDto) {
    const { id, ...entry } = dto;
    return this.system.upsertEntry(id, entry);
  }
}
