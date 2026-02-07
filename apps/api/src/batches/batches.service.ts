import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { ScriptGeneratorService } from '../generation/script-generator.service';
import { CreditsService } from '../credits/credits.service';
import { CreateBatchDto, RegenerateDto } from './dto';
import { SCRIPT_GENERATION_QUEUE, SCRIPT_GENERATION_PRO_QUEUE } from '../queue/constants';
import { ScriptGenerationJobData } from '../queue/script-generation.processor';
import { BATCH_LIMITS } from '../config';

// Credit cost per script (single tier - 1 credit = 1 script)
const CREDIT_COST_PER_SCRIPT = 1;

@Injectable()
export class BatchesService {
  private readonly logger = new Logger(BatchesService.name);

  constructor(
    private prisma: PrismaService,
    private scriptGenerator: ScriptGeneratorService,
    private creditsService: CreditsService,
    @InjectQueue(SCRIPT_GENERATION_QUEUE) private scriptQueue: Queue<ScriptGenerationJobData>,
    @InjectQueue(SCRIPT_GENERATION_PRO_QUEUE) private scriptProQueue: Queue<ScriptGenerationJobData>,
  ) {}

  /**
   * Get the appropriate queue based on user's plan
   */
  private async getQueueForUser(userId: string): Promise<Queue<ScriptGenerationJobData>> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true },
    });

    if (user?.plan === 'pro') {
      this.logger.log(`User ${userId} is Pro, using dedicated queue`);
      return this.scriptProQueue;
    }

    return this.scriptQueue;
  }

  private async verifyProjectAccess(userId: string, projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return project;
  }

  private async verifyBatchAccess(userId: string, batchId: string) {
    const batch = await this.prisma.batch.findUnique({
      where: { id: batchId },
      include: { project: true },
    });

    if (!batch) {
      throw new NotFoundException('Batch not found');
    }

    if (batch.project.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return batch;
  }

  async create(userId: string, projectId: string, dto: CreateBatchDto) {
    await this.verifyProjectAccess(userId, projectId);

    // Support both scriptsPerAngle (new) and requestedCount (legacy)
    // scriptsPerAngle takes precedence if provided
    let requestedCount: number;
    if (dto.scriptsPerAngle !== undefined) {
      requestedCount = dto.scriptsPerAngle * dto.angles.length;
    } else if (dto.requestedCount !== undefined) {
      requestedCount = dto.requestedCount;
    } else {
      throw new BadRequestException('Either scriptsPerAngle or requestedCount must be provided');
    }

    // Validate total scripts don't exceed limit
    if (requestedCount > BATCH_LIMITS.maxTotalScripts) {
      throw new BadRequestException(
        `Total scripts (${requestedCount}) exceeds limit of ${BATCH_LIMITS.maxTotalScripts}. ` +
        `Reduce scripts per angle or select fewer angles.`,
      );
    }

    const creditCost = CREDIT_COST_PER_SCRIPT * requestedCount;

    // Check if user has enough credits
    const hasCredits = await this.creditsService.hasEnoughCredits(userId, creditCost);
    if (!hasCredits) {
      const available = await this.creditsService.getTotalAvailable(userId);
      throw new BadRequestException(
        `Insufficient credits. Need ${creditCost}, have ${available}. ` +
        `Each script costs ${CREDIT_COST_PER_SCRIPT} credit.`,
      );
    }

    // Create batch
    const batch = await this.prisma.batch.create({
      data: {
        projectId,
        requestedCount,
        platform: dto.platform,
        angles: dto.angles,
        durations: dto.durations,
        personaIds: dto.personaIds || [],
        status: 'pending',
      },
    });

    // Consume credits
    await this.creditsService.consume(
      userId,
      creditCost,
      batch.id,
      `Generated ${requestedCount} scripts`,
    );

    // Add job to appropriate queue based on user plan
    const queue = await this.getQueueForUser(userId);
    const job = await queue.add(
      'generate-batch',
      { type: 'generate-batch', batchId: batch.id },
      {
        jobId: `batch-${batch.id}`,
      },
    );

    this.logger.log(`Queued job ${job.id} for batch ${batch.id}, consumed ${creditCost} credits`);

    return batch;
  }

  async findOne(userId: string, batchId: string) {
    const batch = await this.verifyBatchAccess(userId, batchId);

    const completedCount = await this.prisma.script.count({
      where: { batchId, status: { in: ['generated', 'completed'] } },
    });

    return { ...batch, completedCount };
  }

  async findAllByProject(userId: string, projectId: string) {
    await this.verifyProjectAccess(userId, projectId);

    const batches = await this.prisma.batch.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { scripts: true },
        },
        scripts: {
          where: { status: { in: ['generated', 'completed'] } },
          select: { id: true },
        },
      },
    });

    return batches.map(({ scripts, ...batch }) => ({
      ...batch,
      completedCount: scripts.length,
    }));
  }

  async getScripts(userId: string, batchId: string) {
    await this.verifyBatchAccess(userId, batchId);

    return this.prisma.script.findMany({
      where: { batchId, status: { in: ['completed', 'failed'] } },
      orderBy: [{ score: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async getRecentScripts(userId: string, limit = 5) {
    const scripts = await this.prisma.script.findMany({
      where: {
        batch: {
          project: {
            userId,
          },
        },
        status: 'completed',
        hook: { not: null },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        batch: {
          include: {
            project: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return scripts.map((script: typeof scripts[number]) => ({
      id: script.id,
      hook: script.hook || '',
      angle: script.angle,
      score: script.score,
      createdAt: script.createdAt,
      batchId: script.batchId,
      projectId: script.batch.project.id,
      projectName: script.batch.project.name,
    }));
  }

  async regenerateScript(
    userId: string,
    scriptId: string,
    dto: RegenerateDto,
  ) {
    const script = await this.prisma.script.findUnique({
      where: { id: scriptId },
      include: {
        batch: {
          include: { project: true },
        },
      },
    });

    if (!script) {
      throw new NotFoundException('Script not found');
    }

    if (script.batch.project.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    // Credit cost for regeneration (single tier)
    const creditCost = CREDIT_COST_PER_SCRIPT;

    // Check if user has enough credits
    const hasCredits = await this.creditsService.hasEnoughCredits(userId, creditCost);
    if (!hasCredits) {
      const available = await this.creditsService.getTotalAvailable(userId);
      throw new BadRequestException(
        `Insufficient credits. Need ${creditCost}, have ${available}.`,
      );
    }

    // Always link to the root original (1 level deep max)
    // If this script has a parent, use that parent as the root
    // Otherwise, this script IS the root
    const rootParentId = script.parentScriptId || scriptId;

    // Create new script with pending status and link to root parent
    const newScript = await this.prisma.script.create({
      data: {
        batchId: script.batchId,
        parentScriptId: rootParentId,
        status: 'pending',
        angle: script.angle,
        duration: script.duration,
      },
    });

    // Consume credits
    await this.creditsService.consume(
      userId,
      creditCost,
      script.batchId,
      'Regenerated script',
    );

    // Queue the regeneration job to appropriate queue based on user plan
    // sourceScriptId is the script we're regenerating FROM (for content)
    // scriptId is the new script being created
    const queue = await this.getQueueForUser(userId);
    const job = await queue.add(
      'regenerate-script',
      {
        type: 'regenerate-script',
        scriptId: newScript.id,
        sourceScriptId: scriptId,
        instruction: dto.instruction,
      },
      {
        jobId: `regen-${newScript.id}`,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000, // 2s, 4s, 8s
        },
      },
    );

    this.logger.log(`Queued regeneration job ${job.id} for script ${newScript.id}, consumed ${creditCost} credits`);

    return newScript;
  }
}
