import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ScriptGeneratorService } from '../generation/script-generator.service';
import { SCRIPT_GENERATION_QUEUE } from './constants';

export interface ScriptGenerationJobData {
  type: 'generate-batch' | 'regenerate-script';
  batchId?: string;
  scriptId?: string;
  sourceScriptId?: string;  // The script being regenerated FROM (for content)
  instruction?: string;
}

@Processor(SCRIPT_GENERATION_QUEUE)
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
