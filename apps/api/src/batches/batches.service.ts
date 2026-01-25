import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { ScriptGeneratorService } from '../generation/script-generator.service';
import { CreateBatchDto, RegenerateDto } from './dto';
import { SCRIPT_GENERATION_QUEUE } from '../queue/constants';
import { ScriptGenerationJobData } from '../queue/script-generation.processor';

@Injectable()
export class BatchesService {
  private readonly logger = new Logger(BatchesService.name);

  constructor(
    private prisma: PrismaService,
    private scriptGenerator: ScriptGeneratorService,
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

    // TODO: Add credit balance check here when credits system is implemented

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

    // Add job to queue for processing
    const job = await this.scriptQueue.add(
      'generate-batch',
      { type: 'generate-batch', batchId: batch.id },
      {
        jobId: `batch-${batch.id}`,
      },
    );

    this.logger.log(`Queued job ${job.id} for batch ${batch.id}`);

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

    this.logger.log(`Queued regeneration job ${job.id} for script ${newScript.id}`);

    return newScript;
  }
}
