import { Injectable, Logger } from '@nestjs/common';
import { OpenRouterClient } from './openrouter.client';
import { buildHookVariantPrompt } from './prompt-builder';
import { MODEL_CONFIG } from '../config';

interface StoryboardStep {
  t: string;
  shot: string;
  onScreen: string;
  spoken: string;
  broll?: string[];
}

export interface HookVariant {
  label: string;
  hook: string;
  score: number;
  adaptedBeats: StoryboardStep[];
  adaptedBeatCount: number;
}

@Injectable()
export class HookVariantService {
  private readonly logger = new Logger(HookVariantService.name);

  constructor(private openRouter: OpenRouterClient) {}

  /**
   * Generate 2 hook variants (B and C) via a single Gemini Flash call.
   * Each variant gets a new hook + adapted opening beats.
   * Returns [Variant A (original), Variant B, Variant C].
   */
  async generateVariants(params: {
    originalHook: string;
    originalScore: number;
    storyboard: StoryboardStep[];
    angle: string;
    duration: number;
    productName: string;
  }): Promise<HookVariant[]> {
    const { originalHook, originalScore, storyboard, angle, productName } = params;

    // Variant A is always the original
    const variants: HookVariant[] = [
      {
        label: 'A',
        hook: originalHook,
        score: originalScore,
        adaptedBeats: storyboard.slice(0, 2),
        adaptedBeatCount: 0,
      },
    ];

    if (!storyboard || storyboard.length === 0) {
      return variants;
    }

    const beatsToAdapt = storyboard.slice(0, 2);
    const prompt = buildHookVariantPrompt({
      originalHook,
      beats: beatsToAdapt,
      angle,
      productName,
    });

    try {
      const response = await this.openRouter.chatCompletion(
        [
          {
            role: 'system',
            content:
              'You generate hook variants for UGC video ads. Always respond with valid JSON.',
          },
          { role: 'user', content: prompt },
        ],
        {
          model: MODEL_CONFIG.hookAdaptation.model,
          temperature: MODEL_CONFIG.hookAdaptation.temperature,
          maxTokens: MODEL_CONFIG.hookAdaptation.maxTokens,
          jsonMode: true,
        },
      );

      const cleaned = response.trim().replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
      const parsed = JSON.parse(cleaned);

      const generatedVariants = parsed.variants || [];
      const labels = ['B', 'C'];

      for (let i = 0; i < Math.min(generatedVariants.length, 2); i++) {
        const v = generatedVariants[i];
        variants.push({
          label: labels[i],
          hook: v.hook || '',
          score: 0, // No pre-computed score for LLM-generated variants
          adaptedBeats: v.adaptedBeats || beatsToAdapt,
          adaptedBeatCount: v.adaptedBeatCount || beatsToAdapt.length,
        });
      }

      this.logger.log(
        `Generated ${variants.length} hook variants for angle ${angle} (hooks: ${variants.map((v) => `${v.label}="${v.hook.slice(0, 30)}..."`).join(', ')})`,
      );
    } catch (error) {
      this.logger.warn(`Failed to generate hook variants: ${error}`);
      // Graceful fallback: return only variant A
    }

    return variants;
  }
}
