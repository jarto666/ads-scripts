import {
  IsString,
  IsArray,
  IsOptional,
  MinLength,
  MaxLength,
  ArrayMinSize,
  IsIn,
} from 'class-validator';

export class CreateProjectDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  productDescription: string;

  @IsString()
  @MaxLength(500)
  @IsOptional()
  offer?: string;

  @IsString()
  @MaxLength(1000)
  @IsOptional()
  brandVoice?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  forbiddenClaims?: string[];

  @IsArray()
  @ArrayMinSize(1)
  @IsIn(['tiktok', 'reels', 'shorts'], { each: true })
  platforms: string[];

  @IsString()
  @IsOptional()
  language?: string = 'en';

  @IsString()
  @IsOptional()
  region?: string;
}

export class UpdateProjectDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @IsOptional()
  name?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  @IsOptional()
  productDescription?: string;

  @IsString()
  @MaxLength(500)
  @IsOptional()
  offer?: string;

  @IsString()
  @MaxLength(1000)
  @IsOptional()
  brandVoice?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  forbiddenClaims?: string[];

  @IsArray()
  @IsIn(['tiktok', 'reels', 'shorts'], { each: true })
  @IsOptional()
  platforms?: string[];

  @IsString()
  @IsOptional()
  language?: string;

  @IsString()
  @IsOptional()
  region?: string;
}
