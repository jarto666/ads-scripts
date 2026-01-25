import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ maxLength: 100 })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;
}

// Response DTOs
export class ProfileDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiPropertyOptional()
  name?: string;

  @ApiProperty({ enum: ['free', 'pro'] })
  plan: 'free' | 'pro';

  @ApiProperty()
  createdAt: Date;
}

export class DeleteAccountResultDto {
  @ApiProperty()
  success: boolean;
}
