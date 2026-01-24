import {
  IsString,
  IsArray,
  IsNumber,
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
  @IsIn(['tiktok', 'reels', 'shorts'])
  platform: string;

  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  angles: string[];

  @IsArray()
  @IsNumber({}, { each: true })
  @ArrayMinSize(1)
  durations: number[];
}

export class RegenerateDto {
  @IsString()
  instruction: string;
}
