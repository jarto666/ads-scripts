import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class RequestMagicLinkDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;
}

export class ConsumeMagicLinkDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  token: string;
}

// Response DTOs
export class UserDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ nullable: true })
  name: string | null;

  @ApiProperty()
  isAdmin: boolean;

  @ApiProperty({ enum: ['free', 'pro'] })
  plan: 'free' | 'pro';

  @ApiProperty()
  createdAt: Date;
}

export class AuthResponseDto {
  @ApiProperty({ type: UserDto })
  user: UserDto;
}

export class MessageDto {
  @ApiProperty()
  message: string;
}
