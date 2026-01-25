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

  @ApiPropertyOptional({ maxLength: 500 })
  @IsString()
  @MaxLength(500)
  @IsOptional()
  offer?: string;

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

  @ApiPropertyOptional({ maxLength: 500 })
  @IsString()
  @MaxLength(500)
  @IsOptional()
  offer?: string;

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
  offer?: string;

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
