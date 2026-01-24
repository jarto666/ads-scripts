import { IsEmail, IsString, MinLength } from 'class-validator';

export class RequestMagicLinkDto {
  @IsEmail()
  email: string;
}

export class ConsumeMagicLinkDto {
  @IsString()
  @MinLength(1)
  token: string;
}
