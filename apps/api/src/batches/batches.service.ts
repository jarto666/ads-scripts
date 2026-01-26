import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { ScriptGeneratorService } from '../generation/script-generator.service';
import { CreditsService } from '../credits/credits.service';
import { CreateBatchDto, RegenerateDto } from './dto';
import { SCRIPT_GENERATION_QUEUE } from '../queue/constants';
import { ScriptGenerationJobData } from '../queue/script-generation.processor';

// Credit cost per script based on quality
const CREDIT_COSTS = {
  standard: 1,
  premium: 8,
} as const;

@Injectable()
export class BatchesService {
  private readonly logger = new Logger(BatchesService.name);

  constructor(
    private prisma: PrismaService,
    private scriptGenerator: ScriptGeneratorService,
    private creditsService: CreditsService,
    @InjectQueue(SCRIPT_GENERATION_QUEUE) private scriptQueue: Queue<ScriptGenerationJobData>,
  ) {}

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

    const quality = dto.quality || 'standard';
    const creditCost = CREDIT_COSTS[quality] * dto.requestedCount;

    // Check if user has enough credits
    const hasCredits = await this.creditsService.hasEnoughCredits(userId, creditCost);
    if (!hasCredits) {
      const available = await this.creditsService.getTotalAvailable(userId);
      throw new BadRequestException(
        `Insufficient credits. Need ${creditCost}, have ${available}. ` +
        `Each ${quality} script costs ${CREDIT_COSTS[quality]} credit(s).`,
      );
    }

    // Create batch
    const batch = await this.prisma.batch.create({
      data: {
        projectId,
        requestedCount: dto.requestedCount,
        platform: dto.platform,
        angles: dto.angles,
        durations: dto.durations,
        personaIds: dto.personaIds || [],
        quality,
        status: 'pending',
      },
    });

    // Consume credits
    await this.creditsService.consume(
      userId,
      creditCost,
      batch.id,
      `Generated ${dto.requestedCount} ${quality} scripts`,
    );

    // Add job to queue for processing
    const job = await this.scriptQueue.add(
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

    const scriptsCount = await this.prisma.script.count({
      where: { batchId },
    });

    const completedCount = await this.prisma.script.count({
      where: { batchId, status: 'completed' },
    });

    return {
      ...batch,
      scriptsCount,
      completedCount,
      progress:
        batch.requestedCount > 0
          ? Math.round((completedCount / batch.requestedCount) * 100)
          : 0,
    };
  }

  async findAllByProject(userId: string, projectId: string) {
    await this.verifyProjectAccess(userId, projectId);

    return this.prisma.batch.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { scripts: true },
        },
      },
    });
  }

  async getScripts(userId: string, batchId: string) {
    await this.verifyBatchAccess(userId, batchId);

    return this.prisma.script.findMany({
      where: { batchId },
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

    return scripts.map((script) => ({
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

    // Calculate credit cost based on batch quality
    const quality = script.batch.quality as 'standard' | 'premium';
    const creditCost = CREDIT_COSTS[quality] || CREDIT_COSTS.standard;

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
      `Regenerated ${quality} script`,
    );

    // Queue the regeneration job
    // sourceScriptId is the script we're regenerating FROM (for content)
    // scriptId is the new script being created
    const job = await this.scriptQueue.add(
      'regenerate-script',
      {
        type: 'regenerate-script',
        scriptId: newScript.id,
        sourceScriptId: scriptId,
        instruction: dto.instruction,
      },
      {
        jobId: `regen-${newScript.id}`,
      },
    );

    this.logger.log(`Queued regeneration job ${job.id} for script ${newScript.id}, consumed ${creditCost} credits`);

    return newScript;
  }
}
