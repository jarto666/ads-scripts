import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ScriptGeneratorService } from '../generation/script-generator.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreditsService } from '../credits/credits.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { SCRIPT_GENERATION_QUEUE, SCRIPT_GENERATION_PRO_QUEUE } from './constants';

const CREDIT_COST_PER_SCRIPT = 1;

export interface ScriptGenerationJobData {
  type: 'generate-batch' | 'regenerate-script';
  batchId?: string;
  scriptId?: string;
  sourceScriptId?: string;  // The script being regenerated FROM (for content)
  instruction?: string;
}

// Free/standard users processor (lower concurrency)
@Processor(SCRIPT_GENERATION_QUEUE, { concurrency: 2 })
export class ScriptGenerationProcessor extends WorkerHost {
  private readonly logger = new Logger(ScriptGenerationProcessor.name);

  constructor(
    private readonly scriptGenerator: ScriptGeneratorService,
    private readonly prisma: PrismaService,
    private readonly creditsService: CreditsService,
    private readonly notifications: NotificationsGateway,
  ) {
    super();
  }

  async process(job: Job<ScriptGenerationJobData>): Promise<void> {
    const { type } = job.data;

    if (type === 'generate-batch') {
      this.logger.log(`Processing batch generation job ${job.id} for batch ${job.data.batchId}`);
      await this.scriptGenerator.generateBatchWithOvergeneration(job.data.batchId!);
      this.logger.log(`Batch generation job ${job.id} completed`);
    } else if (type === 'regenerate-script') {
      this.logger.log(`Processing regeneration job ${job.id} for script ${job.data.scriptId}`);
      await this.scriptGenerator.processRegeneration(
        job.data.scriptId!,
        job.data.sourceScriptId!,
        job.data.instruction!,
      );
      this.logger.log(`Regeneration job ${job.id} completed`);
    }
  }

  @OnWorkerEvent('active')
  onActive(job: Job<ScriptGenerationJobData>) {
    const target = job.data.batchId || job.data.scriptId;
    this.logger.log(`Job ${job.id} started for ${job.data.type}: ${target}`);
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<ScriptGenerationJobData>) {
    this.logger.log(`Job ${job.id} completed successfully`);
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job<ScriptGenerationJobData>, error: Error) {
    const target = job.data.batchId || job.data.scriptId;
    const maxAttempts = job.opts?.attempts ?? 1;

    this.logger.error(
      `Job ${job.id} failed for ${job.data.type} ${target} (attempt ${job.attemptsMade}/${maxAttempts}): ${error.message}`,
    );

    // Only act after all retries exhausted for regenerate-script jobs
    if (job.attemptsMade >= maxAttempts && job.data.type === 'regenerate-script' && job.data.scriptId) {
      // Check if script is still in generating state (catch block didn't run)
      const script = await this.prisma.script.findUnique({
        where: { id: job.data.scriptId },
        include: { batch: { include: { project: true } } },
      });

      if (script && script.status === 'generating') {
        this.logger.warn(`Script ${job.data.scriptId} still in generating state after job failure, marking as failed`);

        await this.prisma.script.update({
          where: { id: job.data.scriptId },
          data: { status: 'failed', errorMessage: error.message },
        });

        await this.creditsService.refund(
          script.batch.project.userId,
          CREDIT_COST_PER_SCRIPT,
          script.batchId,
          'Refund for failed regeneration',
        );

        this.logger.log(`Refunded ${CREDIT_COST_PER_SCRIPT} credit for failed regeneration of script ${job.data.scriptId}`);

        // Emit WebSocket event for frontend
        this.notifications.emitScriptProgress({
          batchId: script.batchId,
          scriptId: job.data.scriptId,
          status: 'failed',
          completedCount: 0,
          generatingCount: 0,
          totalCount: 1,
          progress: 0,
        });
      }
    }
  }

  @OnWorkerEvent('stalled')
  onStalled(jobId: string) {
    this.logger.warn(`Job ${jobId} stalled and will be retried`);
  }
}

// Pro users processor (higher concurrency, dedicated queue)
@Processor(SCRIPT_GENERATION_PRO_QUEUE, { concurrency: 3 })
export class ScriptGenerationProProcessor extends WorkerHost {
  private readonly logger = new Logger(ScriptGenerationProProcessor.name);

  constructor(
    private readonly scriptGenerator: ScriptGeneratorService,
    private readonly prisma: PrismaService,
    private readonly creditsService: CreditsService,
    private readonly notifications: NotificationsGateway,
  ) {
    super();
  }

  async process(job: Job<ScriptGenerationJobData>): Promise<void> {
    const { type } = job.data;

    if (type === 'generate-batch') {
      this.logger.log(`[PRO] Processing batch generation job ${job.id} for batch ${job.data.batchId}`);
      await this.scriptGenerator.generateBatchWithOvergeneration(job.data.batchId!);
      this.logger.log(`[PRO] Batch generation job ${job.id} completed`);
    } else if (type === 'regenerate-script') {
      this.logger.log(`[PRO] Processing regeneration job ${job.id} for script ${job.data.scriptId}`);
      await this.scriptGenerator.processRegeneration(
        job.data.scriptId!,
        job.data.sourceScriptId!,
        job.data.instruction!,
      );
      this.logger.log(`[PRO] Regeneration job ${job.id} completed`);
    }
  }

  @OnWorkerEvent('active')
  onActive(job: Job<ScriptGenerationJobData>) {
    const target = job.data.batchId || job.data.scriptId;
    this.logger.log(`[PRO] Job ${job.id} started for ${job.data.type}: ${target}`);
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<ScriptGenerationJobData>) {
    this.logger.log(`[PRO] Job ${job.id} completed successfully`);
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job<ScriptGenerationJobData>, error: Error) {
    const target = job.data.batchId || job.data.scriptId;
    const maxAttempts = job.opts?.attempts ?? 1;

    this.logger.error(
      `[PRO] Job ${job.id} failed for ${job.data.type} ${target} (attempt ${job.attemptsMade}/${maxAttempts}): ${error.message}`,
    );

    // Only act after all retries exhausted for regenerate-script jobs
    if (job.attemptsMade >= maxAttempts && job.data.type === 'regenerate-script' && job.data.scriptId) {
      // Check if script is still in generating state (catch block didn't run)
      const script = await this.prisma.script.findUnique({
        where: { id: job.data.scriptId },
        include: { batch: { include: { project: true } } },
      });

      if (script && script.status === 'generating') {
        this.logger.warn(`[PRO] Script ${job.data.scriptId} still in generating state after job failure, marking as failed`);

        await this.prisma.script.update({
          where: { id: job.data.scriptId },
          data: { status: 'failed', errorMessage: error.message },
        });

        await this.creditsService.refund(
          script.batch.project.userId,
          CREDIT_COST_PER_SCRIPT,
          script.batchId,
          'Refund for failed regeneration',
        );

        this.logger.log(`[PRO] Refunded ${CREDIT_COST_PER_SCRIPT} credit for failed regeneration of script ${job.data.scriptId}`);

        // Emit WebSocket event for frontend
        this.notifications.emitScriptProgress({
          batchId: script.batchId,
          scriptId: job.data.scriptId,
          status: 'failed',
          completedCount: 0,
          generatingCount: 0,
          totalCount: 1,
          progress: 0,
        });
      }
    }
  }

  @OnWorkerEvent('stalled')
  onStalled(jobId: string) {
    this.logger.warn(`[PRO] Job ${jobId} stalled and will be retried`);
  }
}
