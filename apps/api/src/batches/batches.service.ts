import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ScriptGeneratorService } from '../generation/script-generator.service';
import { CreateBatchDto, RegenerateDto } from './dto';

@Injectable()
export class BatchesService {
  constructor(
    private prisma: PrismaService,
    private scriptGenerator: ScriptGeneratorService,
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

    // Create batch
    const batch = await this.prisma.batch.create({
      data: {
        projectId,
        requestedCount: dto.requestedCount,
        platform: dto.platform,
        angles: dto.angles,
        durations: dto.durations,
        status: 'pending',
      },
    });

    // Start generation in background (fire and forget)
    this.scriptGenerator.generateBatch(batch.id).catch((err) => {
      console.error('Background generation failed:', err);
    });

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

    return this.scriptGenerator.regenerateScript(scriptId, dto.instruction);
  }
}
