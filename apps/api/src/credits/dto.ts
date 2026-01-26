import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreditsBalanceDto {
  @ApiProperty({ enum: ['free', 'subscription', 'pack'] })
  type: 'free' | 'subscription' | 'pack';

  @ApiProperty()
  balance: number;

  @ApiPropertyOptional()
  expiresAt?: Date;

  @ApiProperty()
  isExpired: boolean;

  @ApiProperty()
  effectiveBalance: number;
}

export class CreditsBalancesResponseDto {
  @ApiProperty({ type: [CreditsBalanceDto] })
  balances: CreditsBalanceDto[];

  @ApiProperty()
  total: number;
}

export class CreditTransactionDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: ['free', 'subscription', 'pack'] })
  creditType: 'free' | 'subscription' | 'pack';

  @ApiProperty()
  amount: number;

  @ApiProperty()
  balanceAfter: number;

  @ApiProperty({ enum: ['renewal', 'generation', 'purchase', 'admin', 'refund', 'expire'] })
  type: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  batchId?: string;

  @ApiPropertyOptional()
  orderId?: string;

  @ApiProperty()
  createdAt: Date;
}
