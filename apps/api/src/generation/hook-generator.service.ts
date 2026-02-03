import { Injectable, Logger } from '@nestjs/common';
import { Project, Persona } from '@prisma/client';
import { OpenRouterClient } from './openrouter.client';
import { StyleFilterService } from './style-filter.service';
import { RerankService } from './rerank.service';
import { buildHookGenerationPrompt } from './prompt-builder';
import { MODEL_CONFIG, calculateHooksPerAngle } from '../config';

/**
 * Hook with score for selection
 */
export interface ScoredHook {
  hook: string;
  angle: string;
  score: number;
  filtered: boolean;
  filterReason?: string;
}

/**
 * Selected hook with angle information
 */
export interface SelectedHook {
  hook: string;
  angle: string;
  score: number;
}

/**
 * Hooks organized by angle from LLM response
 */
export interface HooksPerAngle {
  [angle: string]: string[];
}

/**
 * Result of hook generation with per-angle stats
 */
export interface HookGenerationResult {
  selectedHooks: SelectedHook[];
  allHooks: ScoredHook[];
  stats: {
    generated: number;
    passedFilter: number;
    selected: number;
    generatedPerAngle: Record<string, number>;
    passedFilterPerAngle: Record<string, number>;
    selectedPerAngle: Record<string, number>;
  };
}

@Injectable()
export class HookGeneratorService {
  private readonly logger = new Logger(HookGeneratorService.name);

  constructor(
    private openRouter: OpenRouterClient,
    private styleFilter: StyleFilterService,
    private rerankService: RerankService,
  ) {}

  /**
   * Generate, filter, and select hooks for script generation.
   * Uses per-angle generation and stratified selection to ensure
   * coverage of all selected angles.
   */
  async generateHooks(
    project: Project & { personas: Persona[] },
    settings: {
      platform: string;
      angles: string[];
      quality: 'standard' | 'premium';
      scriptsPerAngle: number;
    },
  ): Promise<HookGenerationResult> {
    const hooksPerAngle = calculateHooksPerAngle(settings.scriptsPerAngle, settings.quality);

    this.logger.log(
      `Generating ${hooksPerAngle} hooks per angle for ${settings.angles.length} angles (${settings.quality} tier)`,
    );

    // Get banned phrases from StylePolicy for prompt
    const policy = await this.styleFilter.getPolicy(project.language || 'en');
    const bannedPhrases = policy?.bannedPhrases || [];

    // Step 1: Generate hooks via LLM (structured by angle)
    const prompt = buildHookGenerationPrompt(project, {
      platform: settings.platform,
      angles: settings.angles,
      hooksPerAngle,
      bannedPhrases,
    });

    const response = await this.openRouter.chatCompletion(
      [
        {
          role: 'system',
          content: 'You generate scroll-stopping hooks for video ads. Always respond with valid JSON.',
        },
        { role: 'user', content: prompt },
      ],
      {
        model: MODEL_CONFIG.hookGeneration.model,
        temperature: MODEL_CONFIG.hookGeneration.temperature,
        maxTokens: MODEL_CONFIG.hookGeneration.maxTokens,
        jsonMode: true,
      },
    );

    // Parse hooks by angle
    let rawHooksByAngle: HooksPerAngle;
    try {
      const parsed = JSON.parse(this.stripMarkdown(response));
      // Handle both object format (new) and array format (legacy fallback)
      if (Array.isArray(parsed)) {
        // Legacy format - distribute evenly across angles
        rawHooksByAngle = this.distributeHooksToAngles(parsed, settings.angles);
      } else {
        rawHooksByAngle = parsed as HooksPerAngle;
      }
    } catch (error) {
      this.logger.error('Failed to parse hooks response:', error);
      rawHooksByAngle = {};
    }

    // Initialize stats
    const generatedPerAngle: Record<string, number> = {};
    const passedFilterPerAngle: Record<string, number> = {};
    const selectedPerAngle: Record<string, number> = {};

    let totalGenerated = 0;
    let totalPassedFilter = 0;

    // Step 2: Filter and score hooks per angle
    const scoredByAngle: Record<string, ScoredHook[]> = {};
    const allHooks: ScoredHook[] = [];

    for (const angle of settings.angles) {
      const hooksForAngle = rawHooksByAngle[angle] || [];
      generatedPerAngle[angle] = hooksForAngle.length;
      totalGenerated += hooksForAngle.length;
      scoredByAngle[angle] = [];
      passedFilterPerAngle[angle] = 0;

      for (const hook of hooksForAngle) {
        if (typeof hook !== 'string' || hook.trim().length === 0) {
          continue;
        }

        // Apply style filter to hook
        const filterResult = await this.styleFilter.filterScript(
          {
            hook: hook,
            storyboard: [],
            ctaVariants: [],
          },
          project.language || 'en',
        );

        // Score hook strength
        const score = this.rerankService.scoreHookStrength(hook);

        const scoredHook: ScoredHook = {
          hook: hook.trim(),
          angle,
          score,
          filtered: !filterResult.passed,
          filterReason: filterResult.violations.length > 0
            ? filterResult.violations[0]
            : undefined,
        };

        scoredByAngle[angle].push(scoredHook);
        allHooks.push(scoredHook);

        if (!scoredHook.filtered) {
          passedFilterPerAngle[angle]++;
          totalPassedFilter++;
        }
      }
    }

    this.logger.log(
      `Hooks: ${totalGenerated} generated, ${totalPassedFilter} passed filter across ${settings.angles.length} angles`,
    );

    // Step 3: Stratified selection - top scriptsPerAngle from each angle
    const selectedHooks: SelectedHook[] = [];

    for (const angle of settings.angles) {
      const scored = scoredByAngle[angle] || [];

      // Get hooks that passed filter, sorted by score
      const passedHooks = scored
        .filter((h) => !h.filtered)
        .sort((a, b) => b.score - a.score);

      // Select top N (scriptsPerAngle) from this angle
      const topN = passedHooks.slice(0, settings.scriptsPerAngle);

      // If not enough passed filter, include some filtered ones as fallback
      if (topN.length < settings.scriptsPerAngle) {
        const needed = settings.scriptsPerAngle - topN.length;
        const fallbackHooks = scored
          .filter((h) => h.filtered)
          .sort((a, b) => b.score - a.score)
          .slice(0, needed);

        if (fallbackHooks.length > 0) {
          this.logger.warn(
            `Angle ${angle}: Not enough hooks passed filter (${passedHooks.length}/${settings.scriptsPerAngle}), using ${fallbackHooks.length} filtered hooks as fallback`,
          );
          topN.push(...fallbackHooks);
        }
      }

      selectedPerAngle[angle] = topN.length;

      selectedHooks.push(
        ...topN.map((h) => ({
          hook: h.hook,
          angle: h.angle,
          score: h.score,
        })),
      );
    }

    this.logger.log(
      `Selected ${selectedHooks.length} hooks across ${settings.angles.length} angles. Distribution: ${Object.entries(selectedPerAngle).map(([a, c]) => `${a}=${c}`).join(', ')}`,
    );

    return {
      selectedHooks,
      allHooks,
      stats: {
        generated: totalGenerated,
        passedFilter: totalPassedFilter,
        selected: selectedHooks.length,
        generatedPerAngle,
        passedFilterPerAngle,
        selectedPerAngle,
      },
    };
  }

  /**
   * Distribute hooks evenly across angles (legacy fallback for array response)
   */
  private distributeHooksToAngles(hooks: string[], angles: string[]): HooksPerAngle {
    const result: HooksPerAngle = {};
    for (const angle of angles) {
      result[angle] = [];
    }

    hooks.forEach((hook, index) => {
      const angleIndex = index % angles.length;
      result[angles[angleIndex]].push(hook);
    });

    return result;
  }

  /**
   * Strip markdown code fences from LLM response
   */
  private stripMarkdown(content: string): string {
    let cleaned = content.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
    }
    return cleaned.trim();
  }
}
