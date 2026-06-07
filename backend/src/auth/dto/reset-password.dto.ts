import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty()
  @IsString() @IsNotEmpty()
  token!: string;

  @ApiProperty({ minLength: 8, maxLength: 72 })
  @IsString() @MinLength(8) @MaxLength(72)
  password!: string;
}
