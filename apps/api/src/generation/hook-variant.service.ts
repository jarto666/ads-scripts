import { Injectable, Logger } from '@nestjs/common';
import { OpenRouterClient } from './openrouter.client';
import { buildHookAdaptationPrompt } from './prompt-builder';
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
   * Adapt the first 1-2 storyboard beats for a variant hook.
   * Uses Gemini Flash at low temperature for consistency.
   */
  async adaptBeatsForHook(params: {
    originalHook: string;
    variantHook: string;
    storyboard: StoryboardStep[];
    angle: string;
    duration: number;
  }): Promise<{ adaptedBeats: StoryboardStep[]; adaptedBeatCount: number }> {
    const { originalHook, variantHook, storyboard } = params;

    if (!storyboard || storyboard.length === 0) {
      return { adaptedBeats: [], adaptedBeatCount: 0 };
    }

    const beatsToAdapt = storyboard.slice(0, 2);
    const prompt = buildHookAdaptationPrompt({
      originalHook,
      variantHook,
      beats: beatsToAdapt,
    });

    try {
      const response = await this.openRouter.chatCompletion(
        [
          {
            role: 'system',
            content:
              'You adapt storyboard beats for hook variants. Always respond with valid JSON.',
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

      const adaptedBeats: StoryboardStep[] = parsed.adaptedBeats || parsed;
      const adaptedBeatCount = Array.isArray(adaptedBeats) ? adaptedBeats.length : 0;

      return { adaptedBeats, adaptedBeatCount };
    } catch (error) {
      this.logger.warn(`Failed to adapt beats for variant hook: ${error}`);
      // Graceful fallback: return original beats unchanged
      return { adaptedBeats: beatsToAdapt, adaptedBeatCount: 0 };
    }
  }

  /**
   * Generate hook variants for a script using its runner-up hooks.
   * Returns array of HookVariant objects including the original as variant A.
   */
  async generateVariants(params: {
    originalHook: string;
    originalScore: number;
    runnerUps: Array<{ hook: string; score: number }>;
    storyboard: StoryboardStep[];
    angle: string;
    duration: number;
  }): Promise<HookVariant[]> {
    const { originalHook, originalScore, runnerUps, storyboard, angle, duration } = params;

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

    if (runnerUps.length === 0) {
      return variants;
    }

    // Adapt beats for runner-ups B and C in parallel
    const labels = ['B', 'C'];
    const adaptPromises = runnerUps.slice(0, 2).map(async (runnerUp, i) => {
      const adapted = await this.adaptBeatsForHook({
        originalHook,
        variantHook: runnerUp.hook,
        storyboard,
        angle,
        duration,
      });

      return {
        label: labels[i],
        hook: runnerUp.hook,
        score: runnerUp.score,
        adaptedBeats: adapted.adaptedBeats,
        adaptedBeatCount: adapted.adaptedBeatCount,
      };
    });

    const adaptedVariants = await Promise.all(adaptPromises);
    variants.push(...adaptedVariants);

    this.logger.log(
      `Generated ${variants.length} hook variants for angle ${angle} (scores: ${variants.map((v) => `${v.label}=${v.score}`).join(', ')})`,
    );

    return variants;
  }
}
