import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsEnum, IsArray, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

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

// --- StylePolicy DTOs ---

export class StylePolicySummaryDto {
  @ApiProperty()
  language: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  bannedPhrasesCount: number;

  @ApiProperty()
  clichePatternsCount: number;

  @ApiProperty()
  scoringWordsCount: number;

  @ApiProperty()
  groundednessPatternsCount: number;

  @ApiProperty()
  updatedAt: Date;
}

export class UpsertStylePolicyDto {
  @ApiPropertyOptional({ enum: ['stable', 'beta'] })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  wordLimits?: Record<string, unknown>;

  // Style filter arrays
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  bannedPhrases?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  bannedRegex?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  softAvoid?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  harshWords?: string[];

  // Cliché detection arrays
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  clicheHookOpeners?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  clicheLlmSmell?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  clicheGenericFiller?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  clicheStructurePatterns?: string[];

  // Scoring word lists
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  hookPowerWords?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  benefitWords?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  visualActionWords?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ctaActionWords?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ctaUrgencyWords?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  conversationalMarkers?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  emotionalPatterns?: string[];

  // Groundedness patterns
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  groundednessAbsolutePatterns?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  groundednessScalePatterns?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  groundednessPromoPatterns?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  groundednessTimelinePatterns?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  groundednessSocialProofPatterns?: string[];
}
