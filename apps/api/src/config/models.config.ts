/**
 * Centralized model configuration for all AI features
 *
 * Single tier: all scripts use Gemini 3 Pro for best quality.
 * Based on benchmark results (2026-01-30):
 * - Gemini 3 Pro: 88/100 quality
 * - Gemini 3 Flash: used for hooks, personas, adaptation (fast tasks)
 */

/**
 * Batch limits for script generation
 */
export const BATCH_LIMITS = {
  maxTotalScripts: 30,
  minHooksPerAngle: 5,
  maxHooksPerAngle: 40,
  minHooks: 6,
  maxHooks: 50,
  minScriptsToGenerate: 3,
  maxScriptsToGenerate: 40,
} as const;

/**
 * Minimum quality thresholds
 * Hooks/scripts below these scores are rejected from selection
 */
export const QUALITY_THRESHOLDS = {
  /** Minimum hook strength score (0-100) to be selected for script generation */
  minHookStrength: 30,
  /** Minimum final score (0-100) for script to be included in results */
  minFinalScore: 40,
} as const;

/**
 * Overgeneration ratios
 * - scripts: how many scripts to generate vs requested
 * - hooks: how many hooks to generate vs scripts
 */
const OVERGEN_RATIO = { scripts: 1.6, hooks: 1.5 } as const;

/**
 * Calculate dynamic overgeneration counts based on requested scripts
 */
export function calculateOvergeneration(
  totalRequested: number,
): { hooksToGenerate: number; scriptsToGenerate: number } {
  const scriptsToGenerate = Math.min(
    BATCH_LIMITS.maxScriptsToGenerate,
    Math.max(
      BATCH_LIMITS.minScriptsToGenerate,
      Math.ceil(totalRequested * OVERGEN_RATIO.scripts),
    ),
  );

  const hooksToGenerate = Math.min(
    BATCH_LIMITS.maxHooks,
    Math.max(
      BATCH_LIMITS.minHooks,
      Math.ceil(scriptsToGenerate * OVERGEN_RATIO.hooks),
    ),
  );

  return { hooksToGenerate, scriptsToGenerate };
}

/**
 * Calculate how many hooks to generate per angle for stratified selection.
 * This ensures we have enough hooks per angle to select from after filtering.
 *
 * @param scriptsPerAngle - Number of scripts requested per angle
 * @returns Number of hooks to generate per angle
 */
export function calculateHooksPerAngle(
  scriptsPerAngle: number,
): number {
  // Generate enough hooks per angle to have selection buffer after filtering
  // We multiply by both the script and hook ratios to account for:
  // 1. Some hooks being filtered out
  // 2. Needing variety for selection
  return Math.min(
    BATCH_LIMITS.maxHooksPerAngle,
    Math.max(
      BATCH_LIMITS.minHooksPerAngle,
      Math.ceil(scriptsPerAngle * OVERGEN_RATIO.hooks * OVERGEN_RATIO.scripts),
    ),
  );
}

/**
 * Validate batch request doesn't exceed limits
 */
export function validateBatchRequest(
  scriptsPerAngle: number,
  anglesCount: number,
): { valid: boolean; totalScripts: number; error?: string } {
  const totalScripts = scriptsPerAngle * anglesCount;

  if (totalScripts > BATCH_LIMITS.maxTotalScripts) {
    return {
      valid: false,
      totalScripts,
      error: `Exceeds limit of ${BATCH_LIMITS.maxTotalScripts} scripts. Reduce scripts per angle or select fewer angles.`,
    };
  }

  if (scriptsPerAngle < 1) {
    return {
      valid: false,
      totalScripts,
      error: 'Scripts per angle must be at least 1.',
    };
  }

  return { valid: true, totalScripts };
}

export const MODEL_CONFIG = {
  /**
   * Script generation model (Gemini 3 Pro for all scripts)
   */
  scriptGeneration: {
    model: 'google/gemini-3-pro-preview',
    temperature: 0.7,
    maxTokens: 4096,
  },

  /**
   * Hook brainstorming (overgeneration step)
   * Higher temperature for more creative variety
   */
  hookGeneration: {
    model: 'google/gemini-3-flash-preview',
    temperature: 0.9,
    maxTokens: 2048,
  },

  /**
   * Persona generation (Pro feature)
   * Structured extraction task
   */
  personaGeneration: {
    model: 'google/gemini-3-flash-preview',
    temperature: 0.7,
    maxTokens: 1024,
  },

  /**
   * Hook variant adaptation (A/B/C variant generation)
   * Adapts first 1-2 storyboard beats to match runner-up hooks
   * Low temperature for consistency with original script tone
   */
  hookAdaptation: {
    model: 'google/gemini-3-flash-preview',
    temperature: 0.5,
    maxTokens: 1024,
  },

  /**
   * URL import analysis
   * Lower temperature for accuracy in content understanding
   */
  urlAnalysis: {
    model: 'google/gemini-3-flash-preview',
    temperature: 0.5,
    maxTokens: 4096,
  },
} as const;

/**
 * Model pricing per 1M tokens (for cost tracking)
 */
export const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'google/gemini-3-flash-preview': { input: 0.5, output: 3.0 },
  'google/gemini-3-pro-preview': { input: 2.0, output: 12.0 },
  'anthropic/claude-haiku-4.5': { input: 1.0, output: 5.0 },
  'anthropic/claude-sonnet-4.5': { input: 3.0, output: 15.0 },
};

