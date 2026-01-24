import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ScriptGeneratorService } from '../generation/script-generator.service';
import { SCRIPT_GENERATION_QUEUE } from './constants';

export interface ScriptGenerationJobData {
  batchId: string;
}

@Processor(SCRIPT_GENERATION_QUEUE)
export class ScriptGenerationProcessor extends WorkerHost {
  private readonly logger = new Logger(ScriptGenerationProcessor.name);

  constructor(private readonly scriptGenerator: ScriptGeneratorService) {
    super();
  }

  async process(job: Job<ScriptGenerationJobData>): Promise<void> {
    this.logger.log(`Processing job ${job.id} for batch ${job.data.batchId}`);

    await this.scriptGenerator.generateBatch(job.data.batchId);

    this.logger.log(`Job ${job.id} completed for batch ${job.data.batchId}`);
  }

  @OnWorkerEvent('active')
  onActive(job: Job<ScriptGenerationJobData>) {
    this.logger.log(`Job ${job.id} started for batch ${job.data.batchId}`);
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<ScriptGenerationJobData>) {
    this.logger.log(`Job ${job.id} completed successfully`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<ScriptGenerationJobData>, error: Error) {
    this.logger.error(
      `Job ${job.id} failed for batch ${job.data.batchId}: ${error.message}`,
    );
  }

  @OnWorkerEvent('stalled')
  onStalled(jobId: string) {
    this.logger.warn(`Job ${jobId} stalled and will be retried`);
  }
}
