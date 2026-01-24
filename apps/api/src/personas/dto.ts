import {
  IsString,
  IsArray,
  IsOptional,
  MinLength,
  MaxLength,
} from 'class-validator';

export class CreatePersonaDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  description: string;

  @IsString()
  @MaxLength(500)
  @IsOptional()
  demographics?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  painPoints?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  desires?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  objections?: string[];
}

export class UpdatePersonaDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @IsOptional()
  name?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  @IsOptional()
  description?: string;

  @IsString()
  @MaxLength(500)
  @IsOptional()
  demographics?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  painPoints?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  desires?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  objections?: string[];
}
