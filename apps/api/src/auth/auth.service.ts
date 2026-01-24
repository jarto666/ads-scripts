import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from './email.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {}

  async requestMagicLink(email: string): Promise<{ message: string }> {
    const normalizedEmail = email.toLowerCase().trim();

    // Find or create user
    let user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: { email: normalizedEmail },
      });
    }

    // Generate token
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = await bcrypt.hash(token, 10);

    // Token expires in 15 minutes
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    // Store token
    await this.prisma.magicLinkToken.create({
      data: {
        tokenHash,
        userId: user.id,
        expiresAt,
      },
    });

    // Send email with magic link
    const webBaseUrl =
      this.configService.get<string>('WEB_BASE_URL') || 'http://localhost:3000';
    const magicLink = `${webBaseUrl}/auth/callback?token=${token}`;

    await this.emailService.sendMagicLink(normalizedEmail, magicLink);

    // Always return success to prevent email enumeration
    return { message: 'If your email is registered, you will receive a magic link shortly.' };
  }

  async consumeMagicLink(token: string): Promise<{
    user: { id: string; email: string; createdAt: Date };
    accessToken: string;
  }> {
    // Find all unexpired, unused tokens for verification
    const tokens = await this.prisma.magicLinkToken.findMany({
      where: {
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    // Find matching token by comparing hashes
    let matchedToken: (typeof tokens)[0] | null = null;
    for (const t of tokens) {
      const isMatch = await bcrypt.compare(token, t.tokenHash);
      if (isMatch) {
        matchedToken = t;
        break;
      }
    }

    if (!matchedToken) {
      throw new UnauthorizedException('Invalid or expired magic link');
    }

    // Mark token as used
    await this.prisma.magicLinkToken.update({
      where: { id: matchedToken.id },
      data: { usedAt: new Date() },
    });

    // Generate JWT
    const payload = { sub: matchedToken.user.id, email: matchedToken.user.email };
    const accessToken = this.jwtService.sign(payload);

    return {
      user: {
        id: matchedToken.user.id,
        email: matchedToken.user.email,
        createdAt: matchedToken.user.createdAt,
      },
      accessToken,
    };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      createdAt: user.createdAt,
    };
  }

  async validateUserById(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
    });
  }
}
