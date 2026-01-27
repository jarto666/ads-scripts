import { Module } from '@nestjs/common';
import { OpenRouterClient } from './openrouter.client';
import { ScriptGeneratorService } from './script-generator.service';
import { ScoringService } from './scoring.service';
import { CreditsModule } from '../credits/credits.module';

@Module({
  imports: [CreditsModule],
  providers: [OpenRouterClient, ScriptGeneratorService, ScoringService],
  exports: [OpenRouterClient, ScriptGeneratorService, ScoringService],
})
export class GenerationModule {}
