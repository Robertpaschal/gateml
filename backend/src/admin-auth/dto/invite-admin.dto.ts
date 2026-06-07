import { IsEmail, IsString, IsNotEmpty, MaxLength, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AdminRole } from '@prisma/client';

export class InviteAdminDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString() @IsNotEmpty() @MaxLength(80)
  name!: string;

  @ApiPropertyOptional({ enum: AdminRole, default: 'SUPPORT' })
  @IsOptional() @IsEnum(AdminRole)
  role?: AdminRole;
}
