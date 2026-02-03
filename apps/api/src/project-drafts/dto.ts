import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsArray,
  IsOptional,
  IsIn,
  IsUrl,
  IsObject,
} from 'class-validator';

// Request DTOs
export class CreateDraftDto {
  @ApiProperty({ enum: ['scratch', 'url'] })
  @IsString()
  @IsIn(['scratch', 'url'])
  importMethod: 'scratch' | 'url';

  @ApiPropertyOptional()
  @IsUrl()
  @IsOptional()
  sourceUrl?: string;
}

export class UpdateDraftDto {
  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  currentStep?: number;

  @ApiPropertyOptional({ type: [Number] })
  @IsArray()
  @IsNumber({}, { each: true })
  @IsOptional()
  completedSteps?: number[];

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  formData?: Record<string, unknown>;
}

export class ImportUrlDto {
  @ApiProperty()
  @IsUrl()
  url: string;
}

export class FinalizeDraftDto {
  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  selectedPersonaIds?: string[];
}

// Response DTOs
export class PersonaSuggestionDto {
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

  @ApiPropertyOptional()
  confidence?: number;
}

export class ExtractionDataDto {
  @ApiPropertyOptional()
  title?: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty({ type: [String] })
  offers: string[];

  @ApiPropertyOptional()
  pageType?: 'homepage' | 'product' | 'landing' | 'unknown';

  @ApiPropertyOptional()
  language?: string;
}

export class DraftFormDataDto {
  @ApiPropertyOptional()
  name?: string;

  @ApiPropertyOptional()
  productDescription?: string;

  @ApiPropertyOptional()
  brandVoice?: string;

  @ApiPropertyOptional({ type: [String] })
  forbiddenClaims?: string[];

  @ApiPropertyOptional()
  language?: string;

  @ApiPropertyOptional()
  region?: string;

  @ApiPropertyOptional({ type: [PersonaSuggestionDto] })
  suggestedPersonas?: PersonaSuggestionDto[];

  @ApiPropertyOptional({ type: [String] })
  selectedPersonaIds?: string[];

  // ProjectFacts fields for grounding
  @ApiPropertyOptional({ type: [String], description: 'Verified product features' })
  features?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Correct workflow steps in order' })
  workflowSteps?: string[];

  @ApiPropertyOptional({ description: 'Exact pricing info' })
  pricing?: string;

  @ApiPropertyOptional({ type: [String], description: 'Allowed promos' })
  promos?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Allowed CTAs' })
  ctaRules?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Allowed proof/stats' })
  allowedProof?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Words to never use' })
  harshLabelsBan?: string[];
}

export class DraftDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  currentStep: number;

  @ApiProperty({ type: [Number] })
  completedSteps: number[];

  @ApiPropertyOptional()
  sourceUrl?: string;

  @ApiProperty()
  importMethod: string;

  @ApiPropertyOptional({ enum: ['pending', 'importing', 'completed', 'failed'] })
  importStatus?: 'pending' | 'importing' | 'completed' | 'failed';

  @ApiPropertyOptional()
  importError?: string;

  @ApiProperty()
  formData: DraftFormDataDto;

  @ApiPropertyOptional()
  extractionData?: ExtractionDataDto;

  @ApiPropertyOptional()
  analysisData?: Record<string, unknown>;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class ImportResultDto {
  @ApiProperty()
  success: boolean;

  @ApiPropertyOptional()
  error?: string;

  @ApiPropertyOptional({ enum: ['AUTH_REQUIRED', 'NO_CONTENT', 'QUOTA_EXCEEDED', 'INVALID_URL', 'EXTRACTION_FAILED', 'TIMEOUT'] })
  errorCode?: 'AUTH_REQUIRED' | 'NO_CONTENT' | 'QUOTA_EXCEEDED' | 'INVALID_URL' | 'EXTRACTION_FAILED' | 'TIMEOUT';

  @ApiPropertyOptional({ type: DraftDto })
  draft?: DraftDto;
}

export class FinalizeResultDto {
  @ApiProperty()
  projectId: string;

  @ApiProperty()
  personasCreated: number;
}
