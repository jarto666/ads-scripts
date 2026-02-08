import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreditsService } from '../credits/credits.service';
import { EmailService } from '../auth/email.service';
import { StyleFilterService } from '../generation/style-filter.service';
import { SCRIPT_GENERATION_QUEUE } from '../queue/constants';
import { ScriptGenerationJobData } from '../queue/script-generation.processor';
import { GrantCreditsDto, UpsertStylePolicyDto } from './dto';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private creditsService: CreditsService,
    private emailService: EmailService,
    private styleFilter: StyleFilterService,
    @InjectQueue(SCRIPT_GENERATION_QUEUE) private scriptQueue: Queue<ScriptGenerationJobData>,
  ) {}

  // Access Requests
  async getAccessRequests(status?: string) {
    return this.prisma.accessRequest.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  async approveRequest(requestId: string) {
    const request = await this.prisma.accessRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Access request not found');
    }

    if (request.status !== 'pending') {
      throw new BadRequestException('Request already processed');
    }

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: request.email },
    });

    if (existingUser) {
      // Just mark as approved
      await this.prisma.accessRequest.update({
        where: { id: requestId },
        data: { status: 'approved' },
      });
      return { user: existingUser, created: false };
    }

    // Check if user was previously deleted (prevent free credit abuse)
    const wasDeleted = await this.prisma.deletedUser.findUnique({
      where: { email: request.email },
    });

    // Create user and mark request as approved
    const [user] = await this.prisma.$transaction([
      this.prisma.user.create({
        data: {
          email: request.email,
        },
      }),
      this.prisma.accessRequest.update({
        where: { id: requestId },
        data: { status: 'approved' },
      }),
    ]);

    // Initialize credits for the new user
    await this.creditsService.initializeNewUser(user.id, !!wasDeleted);

    // Send magic link email to the newly approved user
    await this.sendWelcomeMagicLink(user.id, user.email);

    return { user, created: true, wasDeleted: !!wasDeleted };
  }

  async rejectRequest(requestId: string) {
    const request = await this.prisma.accessRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Access request not found');
    }

    return this.prisma.accessRequest.update({
      where: { id: requestId },
      data: { status: 'rejected' },
    });
  }

  async deleteRequest(requestId: string) {
    return this.prisma.accessRequest.delete({
      where: { id: requestId },
    });
  }

  // Users
  async getUsers() {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        isAdmin: true,
        plan: true,
        createdAt: true,
        _count: {
          select: { projects: true },
        },
      },
    });
  }

  async createUser(email: string, isAdmin = false) {
    const normalizedEmail = email.toLowerCase().trim();

    const existing = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      throw new BadRequestException('User already exists');
    }

    // Check if user was previously deleted (prevent free credit abuse)
    const wasDeleted = await this.prisma.deletedUser.findUnique({
      where: { email: normalizedEmail },
    });

    const user = await this.prisma.user.create({
      data: {
        email: normalizedEmail,
        isAdmin,
      },
    });

    // Initialize credits for the new user
    await this.creditsService.initializeNewUser(user.id, !!wasDeleted);

    return user;
  }

  async deleteUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Store in DeletedUser table to prevent free credit abuse on re-registration
    await this.prisma.deletedUser.upsert({
      where: { email: user.email },
      update: {
        originalPlan: user.plan,
        deletedAt: new Date(),
      },
      create: {
        email: user.email,
        originalPlan: user.plan,
      },
    });

    return this.prisma.user.delete({
      where: { id: userId },
    });
  }

  async toggleAdmin(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { isAdmin: !user.isAdmin },
    });
  }

  async updateUserPlan(userId: string, plan: 'free' | 'pro') {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { plan },
    });
  }

  async getUserDetail(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        isAdmin: true,
        plan: true,
        createdAt: true,
        subscriptionStatus: true,
        subscriptionEndsAt: true,
        _count: {
          select: { projects: true },
        },
        creditBalances: {
          select: {
            type: true,
            balance: true,
            expiresAt: true,
          },
        },
        creditTransactions: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: {
            id: true,
            creditType: true,
            amount: true,
            balanceAfter: true,
            type: true,
            description: true,
            createdAt: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      ...user,
      recentTransactions: user.creditTransactions,
    };
  }

  async grantCredits(userId: string, dto: GrantCreditsDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Determine expiry based on credit type
    let expiresAt: Date | null = null;
    if (dto.creditType === 'free' || dto.creditType === 'subscription') {
      // Set expiry to end of next month
      expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1);
      expiresAt.setDate(1);
      expiresAt.setHours(0, 0, 0, 0);
    }
    // Pack credits never expire (expiresAt stays null)

    await this.creditsService.grant(
      userId,
      dto.creditType,
      dto.amount,
      expiresAt,
      'admin',
      dto.description || `Admin granted ${dto.amount} ${dto.creditType} credits`,
    );

    // Get new balance
    const balances = await this.creditsService.getBalances(userId);
    const newBalance = balances.find((b: { type: string }) => b.type === dto.creditType)?.balance ?? 0;

    return {
      success: true,
      newBalance,
    };
  }

  // Magic Link Generation
  async generateMagicLink(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Generate token
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = await bcrypt.hash(token, 10);

    // Token expires in 7 days for admin-generated links
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.prisma.magicLinkToken.create({
      data: {
        tokenHash,
        userId: user.id,
        expiresAt,
      },
    });

    const webBaseUrl =
      this.configService.get<string>('WEB_BASE_URL') || 'http://localhost:3000';

    return `${webBaseUrl}/auth/callback?token=${token}`;
  }

  // Send welcome magic link email to newly approved users
  private async sendWelcomeMagicLink(userId: string, email: string): Promise<void> {
    // Generate token
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = await bcrypt.hash(token, 10);

    // Token expires in 7 days
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.prisma.magicLinkToken.create({
      data: {
        tokenHash,
        userId,
        expiresAt,
      },
    });

    const webBaseUrl =
      this.configService.get<string>('WEB_BASE_URL') || 'http://localhost:3000';
    const magicLink = `${webBaseUrl}/auth/callback?token=${token}`;

    await this.emailService.sendMagicLink(email, magicLink);
  }

  // Stats
  async getStats() {
    const [totalUsers, totalRequests, pendingRequests, totalProjects, totalScripts] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.accessRequest.count(),
        this.prisma.accessRequest.count({ where: { status: 'pending' } }),
        this.prisma.project.count(),
        this.prisma.script.count(),
      ]);

    return {
      totalUsers,
      totalRequests,
      pendingRequests,
      totalProjects,
      totalScripts,
    };
  }

  // Queue Stats
  async getQueueStats() {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.scriptQueue.getWaitingCount(),
      this.scriptQueue.getActiveCount(),
      this.scriptQueue.getCompletedCount(),
      this.scriptQueue.getFailedCount(),
      this.scriptQueue.getDelayedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
    };
  }

  async getQueueJobs(status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' = 'active') {
    const jobs = await this.scriptQueue.getJobs([status], 0, 20);
    return jobs.map((job) => ({
      id: job.id,
      name: job.name,
      data: job.data,
      status,
      attemptsMade: job.attemptsMade,
      timestamp: job.timestamp,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
      failedReason: job.failedReason,
    }));
  }

  async retryJob(jobId: string) {
    const job = await this.scriptQueue.getJob(jobId);
    if (!job) {
      throw new NotFoundException('Job not found');
    }
    await job.retry();
    return { success: true };
  }

  // ============ Style Policies ============

  async getStylePolicies() {
    const policies = await this.prisma.stylePolicy.findMany({
      orderBy: { language: 'asc' },
    });

    return policies.map((p) => ({
      language: p.language,
      status: p.status,
      bannedPhrasesCount: p.bannedPhrases.length + p.bannedRegex.length + p.softAvoid.length + p.harshWords.length,
      clichePatternsCount: p.clicheHookOpeners.length + p.clicheLlmSmell.length + p.clicheGenericFiller.length + p.clicheStructurePatterns.length,
      scoringWordsCount: p.hookPowerWords.length + p.benefitWords.length + p.visualActionWords.length + p.ctaActionWords.length + p.ctaUrgencyWords.length + p.conversationalMarkers.length + p.emotionalPatterns.length,
      groundednessPatternsCount: p.groundednessAbsolutePatterns.length + p.groundednessScalePatterns.length + p.groundednessPromoPatterns.length + p.groundednessTimelinePatterns.length + p.groundednessSocialProofPatterns.length,
      updatedAt: p.updatedAt,
    }));
  }

  async getStylePolicy(language: string) {
    const policy = await this.prisma.stylePolicy.findUnique({
      where: { language },
    });

    if (!policy) {
      throw new NotFoundException(`Style policy for language "${language}" not found`);
    }

    return policy;
  }

  async upsertStylePolicy(language: string, dto: UpsertStylePolicyDto) {
    // Build data object from only the fields provided
    const data: Record<string, unknown> = {};

    if (dto.status !== undefined) data.status = dto.status;
    if (dto.wordLimits !== undefined) data.wordLimits = dto.wordLimits;
    if (dto.bannedPhrases !== undefined) data.bannedPhrases = dto.bannedPhrases;
    if (dto.bannedRegex !== undefined) data.bannedRegex = dto.bannedRegex;
    if (dto.softAvoid !== undefined) data.softAvoid = dto.softAvoid;
    if (dto.harshWords !== undefined) data.harshWords = dto.harshWords;
    if (dto.clicheHookOpeners !== undefined) data.clicheHookOpeners = dto.clicheHookOpeners;
    if (dto.clicheLlmSmell !== undefined) data.clicheLlmSmell = dto.clicheLlmSmell;
    if (dto.clicheGenericFiller !== undefined) data.clicheGenericFiller = dto.clicheGenericFiller;
    if (dto.clicheStructurePatterns !== undefined) data.clicheStructurePatterns = dto.clicheStructurePatterns;
    if (dto.hookPowerWords !== undefined) data.hookPowerWords = dto.hookPowerWords;
    if (dto.benefitWords !== undefined) data.benefitWords = dto.benefitWords;
    if (dto.visualActionWords !== undefined) data.visualActionWords = dto.visualActionWords;
    if (dto.ctaActionWords !== undefined) data.ctaActionWords = dto.ctaActionWords;
    if (dto.ctaUrgencyWords !== undefined) data.ctaUrgencyWords = dto.ctaUrgencyWords;
    if (dto.conversationalMarkers !== undefined) data.conversationalMarkers = dto.conversationalMarkers;
    if (dto.emotionalPatterns !== undefined) data.emotionalPatterns = dto.emotionalPatterns;
    if (dto.groundednessAbsolutePatterns !== undefined) data.groundednessAbsolutePatterns = dto.groundednessAbsolutePatterns;
    if (dto.groundednessScalePatterns !== undefined) data.groundednessScalePatterns = dto.groundednessScalePatterns;
    if (dto.groundednessPromoPatterns !== undefined) data.groundednessPromoPatterns = dto.groundednessPromoPatterns;
    if (dto.groundednessTimelinePatterns !== undefined) data.groundednessTimelinePatterns = dto.groundednessTimelinePatterns;
    if (dto.groundednessSocialProofPatterns !== undefined) data.groundednessSocialProofPatterns = dto.groundednessSocialProofPatterns;

    const policy = await this.prisma.stylePolicy.upsert({
      where: { language },
      create: { language, ...data } as any,
      update: data as any,
    });

    // Clear cache so next generation uses new data
    this.styleFilter.clearCache();

    return policy;
  }

  async deleteStylePolicy(language: string) {
    const policy = await this.prisma.stylePolicy.findUnique({
      where: { language },
    });

    if (!policy) {
      throw new NotFoundException(`Style policy for language "${language}" not found`);
    }

    await this.prisma.stylePolicy.delete({
      where: { language },
    });

    this.styleFilter.clearCache();

    return { success: true };
  }
}
