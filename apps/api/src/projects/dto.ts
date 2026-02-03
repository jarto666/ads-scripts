import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsArray,
  IsOptional,
  MinLength,
  MaxLength,
} from 'class-validator';

export class CreateProjectDto {
  @ApiProperty({ maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiProperty({ maxLength: 2000 })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  productDescription: string;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsString()
  @MaxLength(1000)
  @IsOptional()
  brandVoice?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  forbiddenClaims?: string[];

  @ApiPropertyOptional({ default: 'en' })
  @IsString()
  @IsOptional()
  language?: string = 'en';

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  region?: string;
}

export class UpdateProjectDto {
  @ApiPropertyOptional({ maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  @IsOptional()
  productDescription?: string;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsString()
  @MaxLength(1000)
  @IsOptional()
  brandVoice?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  forbiddenClaims?: string[];

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  language?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  region?: string;
}

// Response DTOs
export class PersonaDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  description: string;

  @ApiPropertyOptional()
  demographics?: string;

  @ApiProperty({ type: [String] })
  painPoints: string[];

  @ApiProperty({ type: [String] })
  desires: string[];

  @ApiProperty({ type: [String] })
  objections: string[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class ProjectDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  productDescription: string;

  @ApiPropertyOptional()
  brandVoice?: string;

  @ApiProperty({ type: [String] })
  forbiddenClaims: string[];

  @ApiProperty()
  language: string;

  @ApiPropertyOptional()
  region?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional({ type: [PersonaDto] })
  personas?: PersonaDto[];
}

export class ProjectListItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  productDescription: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

// ============================================================
// ProjectFacts DTOs - Grounding data to prevent hallucinations
// ============================================================

export class UpsertProjectFactsDto {
  @ApiPropertyOptional({ type: [String], description: 'Verified product features' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  features?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Correct workflow steps in order' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  workflowSteps?: string[];

  @ApiPropertyOptional({ description: 'Exact pricing info (e.g., "$9/mo")' })
  @IsString()
  @IsOptional()
  pricing?: string;

  @ApiPropertyOptional({ type: [String], description: 'Allowed promos ONLY (empty = none allowed)' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  promos?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Allowed CTAs' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  ctaRules?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Stats/testimonials we CAN use' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  allowedProof?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Words to never use in scripts' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  harshLabelsBan?: string[];
}

export class ProjectFactsDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  projectId: string;

  @ApiProperty({ type: [String] })
  features: string[];

  @ApiProperty({ type: [String] })
  workflowSteps: string[];

  @ApiPropertyOptional()
  pricing?: string;

  @ApiProperty({ type: [String] })
  promos: string[];

  @ApiProperty({ type: [String] })
  ctaRules: string[];

  @ApiProperty({ type: [String] })
  allowedProof: string[];

  @ApiProperty({ type: [String] })
  harshLabelsBan: string[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

// ============================================================
// ProjectFacts Generation DTOs
// ============================================================

export class GenerateFactsDto {
  @ApiPropertyOptional({ description: 'Product name (for draft mode when no project exists)' })
  @IsString()
  @IsOptional()
  productName?: string;

  @ApiPropertyOptional({ description: 'Product description (for draft mode when no project exists)' })
  @IsString()
  @IsOptional()
  productDescription?: string;
}

export class GeneratedFactsDto {
  @ApiProperty({ type: [String], description: 'Verified product features' })
  features: string[];

  @ApiProperty({ type: [String], description: 'Correct workflow steps in order' })
  workflowSteps: string[];

  @ApiPropertyOptional({ description: 'Exact pricing info (e.g., "$9/mo")' })
  pricing?: string;

  @ApiProperty({ type: [String], description: 'Allowed promos (empty = none allowed)' })
  promos: string[];

  @ApiProperty({ type: [String], description: 'Allowed CTAs' })
  ctaRules: string[];

  @ApiProperty({ type: [String], description: 'Stats/testimonials that can be used' })
  allowedProof: string[];

  @ApiProperty({ type: [String], description: 'Words to never use in scripts' })
  harshLabelsBan: string[];

  @ApiPropertyOptional({ description: 'Suggested brand voice/tone' })
  brandVoice?: string;

  @ApiProperty({ type: [String], description: 'Claims to avoid for this product type' })
  forbiddenClaims: string[];
}
