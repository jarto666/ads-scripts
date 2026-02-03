import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsArray,
  IsNumber,
  IsOptional,
  Min,
  Max,
  ArrayMinSize,
  IsIn,
} from 'class-validator';

export class CreateBatchDto {
  @ApiPropertyOptional({
    minimum: 1,
    maximum: 200,
    description: 'Total scripts to generate (legacy). Use scriptsPerAngle instead.',
  })
  @IsNumber()
  @Min(1)
  @Max(200)
  @IsOptional()
  requestedCount?: number;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: 30,
    description: 'Scripts to generate per angle. Total = scriptsPerAngle × angles.length',
  })
  @IsNumber()
  @Min(1)
  @Max(30)
  @IsOptional()
  scriptsPerAngle?: number;

  @ApiProperty({ enum: ['universal', 'tiktok', 'reels', 'shorts'] })
  @IsString()
  @IsIn(['universal', 'tiktok', 'reels', 'shorts'])
  platform: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  angles: string[];

  @ApiProperty({ type: [Number] })
  @IsArray()
  @IsNumber({}, { each: true })
  @ArrayMinSize(1)
  durations: number[];

  @ApiPropertyOptional({ type: [String], description: 'Empty or omitted = all personas' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  personaIds?: string[];

  @ApiPropertyOptional({ enum: ['standard', 'premium'], default: 'standard' })
  @IsString()
  @IsIn(['standard', 'premium'])
  @IsOptional()
  quality?: 'standard' | 'premium';
}

export class RegenerateDto {
  @ApiProperty()
  @IsString()
  instruction: string;
}

// Response DTOs
export class StoryboardStepDto {
  @ApiProperty()
  t: string;

  @ApiProperty()
  shot: string;

  @ApiProperty()
  onScreen: string;

  @ApiProperty()
  spoken: string;

  @ApiPropertyOptional({ type: [String] })
  broll?: string[];
}

export class ScriptDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: ['pending', 'generating', 'completed', 'failed'] })
  status: string;

  @ApiProperty()
  angle: string;

  @ApiProperty()
  duration: number;

  @ApiPropertyOptional()
  hook?: string;

  @ApiPropertyOptional({ type: [StoryboardStepDto] })
  storyboard?: StoryboardStepDto[];

  @ApiProperty({ type: [String] })
  ctaVariants: string[];

  @ApiProperty({ type: [String] })
  filmingChecklist: string[];

  @ApiProperty({ type: [String] })
  warnings: string[];

  @ApiPropertyOptional()
  score?: number;

  @ApiPropertyOptional({ description: 'Quality analytics data (admin-only)' })
  analyticsData?: object;

  @ApiPropertyOptional()
  errorMessage?: string;

  @ApiPropertyOptional({ description: 'ID of the parent script if this is a regenerated version' })
  parentScriptId?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class BatchScriptsCountDto {
  @ApiProperty()
  scripts: number;
}

export class BatchDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: ['pending', 'processing', 'completed', 'failed'] })
  status: string;

  @ApiProperty()
  requestedCount: number;

  @ApiProperty()
  platform: string;

  @ApiProperty({ type: [String] })
  angles: string[];

  @ApiProperty({ type: [Number] })
  durations: number[];

  @ApiProperty({ type: [String] })
  personaIds: string[];

  @ApiProperty({ enum: ['standard', 'premium'] })
  quality: 'standard' | 'premium';

  @ApiPropertyOptional()
  pdfUrl?: string;

  @ApiPropertyOptional()
  csvUrl?: string;

  @ApiPropertyOptional()
  errorMessage?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional()
  scriptsCount?: number;

  @ApiPropertyOptional()
  completedCount?: number;

  @ApiPropertyOptional()
  progress?: number;

  @ApiPropertyOptional({ type: BatchScriptsCountDto })
  _count?: BatchScriptsCountDto;
}

export class ExportResultDto {
  @ApiProperty()
  pdfUrl: string;

  @ApiProperty()
  csvUrl: string;
}

export class AnalyticsExportResultDto {
  @ApiProperty()
  jsonUrl: string;
}

export class RecentScriptDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  hook: string;

  @ApiProperty()
  angle: string;

  @ApiPropertyOptional()
  score?: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  batchId: string;

  @ApiProperty()
  projectId: string;

  @ApiProperty()
  projectName: string;
}
