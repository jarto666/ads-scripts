import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScriptGenerationProcessor, ScriptGenerationProProcessor } from './script-generation.processor';
import { GenerationModule } from '../generation/generation.module';
import { SCRIPT_GENERATION_QUEUE, SCRIPT_GENERATION_PRO_QUEUE } from './constants';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
          password: configService.get<string>('REDIS_PASSWORD'),
        },
      }),
      inject: [ConfigService],
    }),
    // Free/standard users queue
    BullModule.registerQueue({
      name: SCRIPT_GENERATION_QUEUE,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: {
          age: 24 * 3600, // Keep completed jobs for 24 hours
          count: 100,
        },
        removeOnFail: {
          age: 7 * 24 * 3600, // Keep failed jobs for 7 days
        },
      },
    }),
    // Pro users dedicated queue (higher throughput)
    BullModule.registerQueue({
      name: SCRIPT_GENERATION_PRO_QUEUE,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: {
          age: 24 * 3600,
          count: 100,
        },
        removeOnFail: {
          age: 7 * 24 * 3600,
        },
      },
    }),
    GenerationModule,
  ],
  providers: [ScriptGenerationProcessor, ScriptGenerationProProcessor],
  exports: [BullModule],
})
export class QueueModule {}
