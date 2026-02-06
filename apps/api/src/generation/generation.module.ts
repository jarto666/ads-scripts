import { Module } from '@nestjs/common';
import { OpenRouterClient } from './openrouter.client';
import { ScriptGeneratorService } from './script-generator.service';
import { ScoringService } from './scoring.service';
import { StyleFilterService } from './style-filter.service';
import { HookGeneratorService } from './hook-generator.service';
import { HookVariantService } from './hook-variant.service';
import { RerankService } from './rerank.service';
import { GroundednessService } from './groundedness.service';
import { CreditsModule } from '../credits/credits.module';

@Module({
  imports: [CreditsModule],
  providers: [
    OpenRouterClient,
    ScriptGeneratorService,
    ScoringService,
    StyleFilterService,
    HookGeneratorService,
    HookVariantService,
    RerankService,
    GroundednessService,
  ],
  exports: [
    OpenRouterClient,
    ScriptGeneratorService,
    ScoringService,
    StyleFilterService,
    HookGeneratorService,
    HookVariantService,
    RerankService,
    GroundednessService,
  ],
})
export class GenerationModule {}
