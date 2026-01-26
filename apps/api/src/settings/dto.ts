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

  @ApiPropertyOptional({ enum: ['active', 'cancelled', 'expired', 'past_due'] })
  subscriptionStatus?: string;

  @ApiPropertyOptional()
  subscriptionEndsAt?: Date;

  @ApiProperty()
  createdAt: Date;
}

export class DeleteAccountResultDto {
  @ApiProperty()
  success: boolean;
}
