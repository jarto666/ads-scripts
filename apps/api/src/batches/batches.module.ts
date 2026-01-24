import { Module } from '@nestjs/common';
import { BatchesController } from './batches.controller';
import { BatchesService } from './batches.service';
import { GenerationModule } from '../generation/generation.module';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [GenerationModule, QueueModule],
  controllers: [BatchesController],
  providers: [BatchesService],
  exports: [BatchesService],
})
export class BatchesModule {}
