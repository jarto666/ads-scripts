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
  @IsNumber()
  @Min(1)
  @Max(200)
  requestedCount: number;

  @IsString()
  @IsIn(['universal', 'tiktok', 'reels', 'shorts'])
  platform: string;

  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  angles: string[];

  @IsArray()
  @IsNumber({}, { each: true })
  @ArrayMinSize(1)
  durations: number[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  personaIds?: string[]; // Empty or omitted = all personas

  @IsString()
  @IsIn(['standard', 'premium'])
  @IsOptional()
  quality?: 'standard' | 'premium';
}

export class RegenerateDto {
  @IsString()
  instruction: string;
}
