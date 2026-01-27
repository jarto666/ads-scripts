import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CheckoutUrlDto {
  @ApiProperty()
  url: string;
}

export class SubscriptionInfoDto {
  @ApiProperty({ enum: ['free', 'pro'] })
  plan: 'free' | 'pro';

  @ApiPropertyOptional({ enum: ['active', 'cancelled', 'expired', 'past_due', 'paused'] })
  status?: string;

  @ApiPropertyOptional()
  endsAt?: Date;

  @ApiProperty()
  hasSubscription: boolean;

  @ApiProperty({ description: 'Whether the cancelled subscription can be resumed (not yet expired)' })
  canResume: boolean;
}

export class CancelSubscriptionResultDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  message: string;
}
