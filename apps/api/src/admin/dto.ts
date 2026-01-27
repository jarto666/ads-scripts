import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsEnum, Min } from 'class-validator';

export class AdminUserDetailDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  isAdmin: boolean;

  @ApiProperty()
  plan: string;

  @ApiProperty()
  createdAt: Date;

  @ApiPropertyOptional()
  subscriptionStatus?: string;

  @ApiPropertyOptional()
  subscriptionEndsAt?: Date;

  @ApiProperty()
  _count: {
    projects: number;
  };

  @ApiProperty()
  creditBalances: {
    type: string;
    balance: number;
    expiresAt: Date | null;
  }[];

  @ApiProperty()
  recentTransactions: {
    id: string;
    creditType: string;
    amount: number;
    balanceAfter: number;
    type: string;
    description: string | null;
    createdAt: Date;
  }[];
}

export class GrantCreditsDto {
  @ApiProperty({ enum: ['free', 'subscription', 'pack'] })
  @IsEnum(['free', 'subscription', 'pack'])
  creditType: 'free' | 'subscription' | 'pack';

  @ApiProperty()
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;
}

export class GrantCreditsResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  newBalance: number;
}

export class UpdateUserPlanDto {
  @ApiProperty({ enum: ['free', 'pro'] })
  @IsEnum(['free', 'pro'])
  plan: 'free' | 'pro';
}
