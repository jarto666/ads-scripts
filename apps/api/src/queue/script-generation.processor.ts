import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ScriptGeneratorService } from '../generation/script-generator.service';
import { SCRIPT_GENERATION_QUEUE, SCRIPT_GENERATION_PRO_QUEUE } from './constants';

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

  constructor(private readonly scriptGenerator: ScriptGeneratorService) {
    super();
  }

  async process(job: Job<ScriptGenerationJobData>): Promise<void> {
    const { type } = job.data;

    if (type === 'generate-batch') {
      this.logger.log(`Processing batch generation job ${job.id} for batch ${job.data.batchId}`);
      await this.scriptGenerator.generateBatch(job.data.batchId!);
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
  onFailed(job: Job<ScriptGenerationJobData>, error: Error) {
    const target = job.data.batchId || job.data.scriptId;
    this.logger.error(
      `Job ${job.id} failed for ${job.data.type} ${target}: ${error.message}`,
    );
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

  constructor(private readonly scriptGenerator: ScriptGeneratorService) {
    super();
  }

  async process(job: Job<ScriptGenerationJobData>): Promise<void> {
    const { type } = job.data;

    if (type === 'generate-batch') {
      this.logger.log(`[PRO] Processing batch generation job ${job.id} for batch ${job.data.batchId}`);
      await this.scriptGenerator.generateBatch(job.data.batchId!);
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
  onFailed(job: Job<ScriptGenerationJobData>, error: Error) {
    const target = job.data.batchId || job.data.scriptId;
    this.logger.error(
      `[PRO] Job ${job.id} failed for ${job.data.type} ${target}: ${error.message}`,
    );
  }

  @OnWorkerEvent('stalled')
  onStalled(jobId: string) {
    this.logger.warn(`[PRO] Job ${jobId} stalled and will be retried`);
  }
}
