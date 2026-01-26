import { Module } from '@nestjs/common';
import { BatchesController } from './batches.controller';
import { BatchesService } from './batches.service';
import { GenerationModule } from '../generation/generation.module';
import { QueueModule } from '../queue/queue.module';
import { CreditsModule } from '../credits/credits.module';

@Module({
  imports: [GenerationModule, QueueModule, CreditsModule],
  controllers: [BatchesController],
  providers: [BatchesService],
  exports: [BatchesService],
})
export class BatchesModule {}
