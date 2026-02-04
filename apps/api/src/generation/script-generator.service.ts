import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OpenRouterClient } from './openrouter.client';
import {
  buildPass1Prompt,
  buildPass2Prompt,
  buildRepairPrompt,
  buildRegenerationPrompt,
} from './prompt-builder';
import { getLanguageInstruction } from './language-utils';
import { validateBeatCount, getBeatRange } from './platform-profiles';
import { ScoringService } from './scoring.service';
import { StyleFilterService } from './style-filter.service';
import { HookGeneratorService, SelectedHook } from './hook-generator.service';
import { RerankService, RerankScores } from './rerank.service';
import { GroundednessService } from './groundedness.service';
import { CreditsService } from '../credits/credits.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { Project, Persona, Batch, Prisma, ProjectFacts } from '@prisma/client';
import { getScriptModel, validateBatchRequest, QUALITY_THRESHOLDS } from '../config';

// Legacy mapping for backward compatibility - now uses config
const getModelForQuality = (quality: string) => {
  const config = getScriptModel(quality === 'premium' ? 'premium' : 'standard');
  return config.model;
};

// Credit cost per script (single tier - 1 credit = 1 script)
const CREDIT_COST_PER_SCRIPT = 1;

// Concurrency limit for parallel script generation
// Keep moderate to avoid rate limiting from LLM providers
const SCRIPT_GENERATION_CONCURRENCY = 4;

// Max retries for LLM refusals
const MAX_SCRIPT_RETRIES = 3;

interface ScriptPlan {
  angle: string;
  duration: number;
  hookIdea: string;
  beats: string[];
  complianceNotes: string[];
}

interface ScriptOutput {
  angle: string;
  duration: number;
  hook: string;
  storyboard: Array<{
    t: string;
    shot: string;
    onScreen: string;
    spoken: string;
    broll?: string[];
  }>;
  ctaVariants: string[];
  filmingChecklist: string[];
  warnings?: string[];
  // Soft filter violations (script is kept but penalized in ranking)
  filterViolations?: string[];
}

@Injectable()
export class ScriptGeneratorService {
  private readonly logger = new Logger(ScriptGeneratorService.name);

  constructor(
    private prisma: PrismaService,
    private openRouter: OpenRouterClient,
    private scoringService: ScoringService,
    private styleFilter: StyleFilterService,
    private hookGenerator: HookGeneratorService,
    private rerankService: RerankService,
    private groundednessService: GroundednessService,
    private creditsService: CreditsService,
    private notifications: NotificationsGateway,
  ) {}

  async generateBatch(batchId: string): Promise<void> {
    const batch = await this.prisma.batch.findUnique({
      where: { id: batchId },
      include: {
        project: {
          include: {
            personas: true,
          },
        },
        scripts: true, // Include existing scripts for retry resilience
      },
    });

    if (!batch) {
      throw new Error('Batch not found');
    }

    // Skip if already completed
    if (batch.status === 'completed') {
      this.logger.log(`Batch ${batchId} already completed, skipping`);
      return;
    }

    try {
      // Update batch status
      await this.prisma.batch.update({
        where: { id: batchId },
        data: { status: 'processing' },
      });

      // Check if we have existing scripts (retry scenario)
      const existingScriptCount = batch.scripts.length;
      const remainingCount = batch.requestedCount - existingScriptCount;

      if (remainingCount <= 0) {
        // All scripts already generated, just mark as complete
        await this.prisma.batch.update({
          where: { id: batchId },
          data: { status: 'completed' },
        });
        this.logger.log(`Batch ${batchId} already has all scripts, marking complete`);
        return;
      }

      this.logger.log(
        `Batch ${batchId}: ${existingScriptCount} existing scripts, generating ${remainingCount} more`,
      );

      // Filter personas if specific ones were selected
      const filteredPersonas =
        batch.personaIds.length > 0
          ? batch.project.personas.filter((p) => batch.personaIds.includes(p.id))
          : batch.project.personas;

      const projectWithFilteredPersonas = {
        ...batch.project,
        personas: filteredPersonas,
      };

      const batchWithFilteredProject = {
        ...batch,
        project: projectWithFilteredPersonas,
        requestedCount: remainingCount,
      };

      // Load ProjectFacts for grounding (prevents hallucinations)
      const facts = await this.groundednessService.getProjectFacts(batch.projectId);
      if (facts) {
        this.logger.log(`Loaded ProjectFacts for grounding (features: ${facts.features.length}, proofs: ${facts.allowedProof.length})`);
      }

      // Pass 1: Generate plans (for remaining scripts only)
      this.logger.log(`Starting Pass 1 for batch ${batchId} with ${filteredPersonas.length} personas`);
      const plans = await this.generatePlans(batchWithFilteredProject, facts);

      // Pass 2: Generate full scripts for each plan (in parallel with controlled concurrency)
      this.logger.log(`Starting Pass 2 for batch ${batchId}: ${plans.length} scripts (concurrency: ${SCRIPT_GENERATION_CONCURRENCY})`);

      // Process scripts in parallel with controlled concurrency
      await this.processPlansInParallel(
        plans,
        batchWithFilteredProject,
        batchId,
        batch.project.forbiddenClaims,
        facts,
      );

      // Update batch status
      await this.prisma.batch.update({
        where: { id: batchId },
        data: { status: 'completed' },
      });

      // Emit batch completed event
      const finalCounts = await this.prisma.script.groupBy({
        by: ['status'],
        where: { batchId },
        _count: true,
      });

      const completedScripts = finalCounts.find(c => c.status === 'completed')?._count || 0;
      const failedScripts = finalCounts.find(c => c.status === 'failed')?._count || 0;

      // Refund credits for failed scripts
      if (failedScripts > 0) {
        const refundAmount = CREDIT_COST_PER_SCRIPT * failedScripts;

        await this.creditsService.refund(
          batch.project.userId,
          refundAmount,
          batchId,
          `Refund for ${failedScripts} failed script(s)`,
        );

        this.logger.log(`Refunded ${refundAmount} credits for ${failedScripts} failed scripts in batch ${batchId}`);
      }

      this.notifications.emitBatchCompleted({
        batchId,
        projectId: batch.projectId,
        totalScripts: plans.length,
        completedScripts,
        failedScripts,
      });

      this.logger.log(`Batch ${batchId} completed`);
    } catch (error) {
      this.logger.error(`Batch ${batchId} failed: ${error}`);

      await this.prisma.batch.update({
        where: { id: batchId },
        data: {
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      // Re-throw to let BullMQ handle retry
      throw error;
    }
  }

  private async generatePlans(
    batch: Batch & { project: Project & { personas: Persona[] } },
    facts?: ProjectFacts | null,
  ): Promise<ScriptPlan[]> {
    const prompt = buildPass1Prompt(
      batch.project,
      {
        platform: batch.platform,
        angles: batch.angles,
        durations: batch.durations,
        count: batch.requestedCount,
      },
      facts,
    );

    const model = getModelForQuality(batch.quality);
    this.logger.log(`Using model ${model} for batch ${batch.id} (quality: ${batch.quality})`);

    const response = await this.openRouter.chatCompletion(
      [
        { role: 'system', content: 'You are a UGC script planning assistant. Always respond with valid JSON.' },
        { role: 'user', content: prompt },
      ],
      { model, temperature: 0.7, jsonMode: true },
    );

    try {
      const plans = JSON.parse(response);
      if (!Array.isArray(plans)) {
        throw new Error('Response is not an array');
      }
      return this.normalizePlans(plans);
    } catch (error) {
      // Try to repair
      this.logger.warn('Pass 1 JSON parse failed, attempting repair');
      const repaired = await this.repairJson(response, error instanceof Error ? error.message : 'Unknown error');
      return this.normalizePlans(JSON.parse(repaired));
    }
  }

  /**
   * Normalize plans to ensure array fields are actually arrays.
   * LLMs sometimes return strings instead of arrays.
   */
  private normalizePlans(plans: unknown[]): ScriptPlan[] {
    return plans.map((plan: unknown) => {
      const p = plan as Record<string, unknown>;
      return {
        angle: String(p.angle || ''),
        duration: Number(p.duration) || 15,
        hookIdea: String(p.hookIdea || ''),
        beats: Array.isArray(p.beats) ? p.beats : (p.beats ? [String(p.beats)] : []),
        complianceNotes: Array.isArray(p.complianceNotes)
          ? p.complianceNotes
          : (p.complianceNotes ? [String(p.complianceNotes)] : []),
      };
    });
  }

  private async generateScript(
    batch: Batch & { project: Project & { personas: Persona[] } },
    plan: ScriptPlan,
    facts?: ProjectFacts | null,
  ): Promise<ScriptOutput> {
    const prompt = buildPass2Prompt(batch.project, plan, batch.platform, facts);
    const model = getModelForQuality(batch.quality);

    for (let attempt = 1; attempt <= MAX_SCRIPT_RETRIES; attempt++) {
      try {
        const response = await this.openRouter.chatCompletion(
          [
            { role: 'system', content: 'You are a UGC script writer. Always respond with valid JSON.' },
            { role: 'user', content: prompt },
          ],
          { model, temperature: 0.7, jsonMode: true },
        );

        if (this.isLlmRefusal(response)) {
          throw new Error('LLM refused to generate content');
        }

        try {
          const cleaned = this.stripMarkdown(response);
          return JSON.parse(cleaned) as ScriptOutput;
        } catch (parseError) {
          this.logger.warn('Pass 2 JSON parse failed, attempting repair');
          const repaired = await this.repairJson(response, parseError instanceof Error ? parseError.message : 'Unknown error');
          return JSON.parse(repaired) as ScriptOutput;
        }
      } catch (error) {
        if (attempt === MAX_SCRIPT_RETRIES) {
          throw error;
        }
        this.logger.warn(`Script attempt ${attempt} failed, retrying: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // This should never be reached due to throw in final attempt
    throw new Error('Script generation failed after all retries');
  }

  /**
   * Validate script for groundedness violations and attempt rewrite if needed.
   * Key principle: NEVER reject scripts - always deliver what was requested.
   * If violations found, try to fix them. If rewrite fails, keep original + warnings.
   */
  private async validateAndRewriteIfNeeded(
    script: ScriptOutput,
    facts: ProjectFacts | null | undefined,
    batch: Batch & { project: Project & { personas: Persona[] } },
  ): Promise<ScriptOutput> {
    // If no facts, we can't validate groundedness meaningfully
    if (!facts) {
      return script;
    }

    // Check groundedness
    const groundednessResult = this.groundednessService.checkGroundedness(
      {
        hook: script.hook,
        storyboard: script.storyboard.map(s => ({
          spoken: s.spoken,
          onScreen: s.onScreen,
        })),
        ctaVariants: script.ctaVariants,
      },
      facts,
    );

    // If no violations, return as-is
    if (groundednessResult.passed) {
      return script;
    }

    this.logger.warn(
      `Script has ${groundednessResult.violations.length} groundedness violations, attempting rewrite`,
    );

    // Attempt rewrite to fix violations
    try {
      const rewritePrompt = this.buildRewritePrompt(script, groundednessResult.violations, facts, batch);

      const response = await this.openRouter.chatCompletion(
        [
          { role: 'system', content: 'You fix scripts to remove violations. Always respond with valid JSON.' },
          { role: 'user', content: rewritePrompt },
        ],
        {
          model: getModelForQuality(batch.quality),
          temperature: 0.3, // Lower temperature for more consistent fixes
          jsonMode: true,
        },
      );

      const cleaned = this.stripMarkdown(response);
      const rewrittenScript = JSON.parse(cleaned) as ScriptOutput;

      // Validate the rewrite
      const rewriteGroundedness = this.groundednessService.checkGroundedness(
        {
          hook: rewrittenScript.hook,
          storyboard: rewrittenScript.storyboard.map(s => ({
            spoken: s.spoken,
            onScreen: s.onScreen,
          })),
          ctaVariants: rewrittenScript.ctaVariants,
        },
        facts,
      );

      // Use rewrite if it's better (fewer violations or passed)
      if (rewriteGroundedness.score > groundednessResult.score) {
        this.logger.log(
          `Rewrite improved groundedness: ${groundednessResult.score} → ${rewriteGroundedness.score}`,
        );
        // Add any remaining violations as warnings
        if (rewriteGroundedness.violations.length > 0) {
          rewrittenScript.warnings = [
            ...(rewrittenScript.warnings || []),
            ...rewriteGroundedness.violations.map(v => `${v.type}: ${v.text}`),
          ];
        }
        return rewrittenScript;
      }

      // Rewrite wasn't better, keep original with warnings
      this.logger.warn('Rewrite did not improve groundedness, keeping original');
    } catch (error) {
      this.logger.error('Rewrite failed:', error);
    }

    // Keep original script but add warnings about violations
    script.warnings = [
      ...(script.warnings || []),
      ...groundednessResult.violations.map(v => `Unverified: ${v.text}`),
    ];

    return script;
  }

  /**
   * Build prompt for rewriting a script to fix groundedness violations.
   */
  private buildRewritePrompt(
    script: ScriptOutput,
    violations: Array<{ type: string; text: string; suggestion?: string }>,
    facts: ProjectFacts,
    batch: Batch & { project: Project & { personas: Persona[] } },
  ): string {
    const violationsList = violations
      .map(v => `- "${v.text}" (${v.type}): ${v.suggestion || 'Remove or replace'}`)
      .join('\n');

    const factsSection = [
      '## VERIFIED FACTS (only use these)',
      facts.features.length > 0 ? `Features: ${facts.features.join(', ')}` : '',
      facts.allowedProof.length > 0 ? `Allowed proof: ${facts.allowedProof.join(', ')}` : 'No proof claims allowed',
      facts.promos.length > 0 ? `Allowed promos: ${facts.promos.join(', ')}` : 'No promotional claims allowed',
      facts.pricing ? `Pricing: ${facts.pricing}` : '',
    ].filter(Boolean).join('\n');

    return `You are fixing a UGC script to remove violations.

## VIOLATIONS TO FIX
${violationsList}

${factsSection}

## ORIGINAL SCRIPT
${JSON.stringify(script, null, 2)}

## TASK
Rewrite the script to remove the violations above while:
1. Keeping the same structure and flow
2. Keeping the same hook style and angle
3. Only using facts from the verified facts list
4. Removing or softening any claims not backed by facts

IMPORTANT:
- Do NOT invent new claims
- Do NOT add promotional offers not in the allowed promos
- Do NOT add statistics not in the allowed proof
- Replace absolute claims with softer alternatives

Return the complete fixed script as valid JSON with the same structure.

OUTPUT CONTRACT:
- Output must be valid JSON
- Output must start with '{' and end with '}'
- Do NOT wrap in markdown fences
- Do NOT include any explanation`;
  }

  /**
   * Process multiple script plans in parallel with controlled concurrency.
   * Uses a semaphore pattern to limit concurrent LLM requests.
   */
  private async processPlansInParallel(
    plans: ScriptPlan[],
    batch: Batch & { project: Project & { personas: Persona[] } },
    batchId: string,
    forbiddenClaims: string[],
    facts?: ProjectFacts | null,
  ): Promise<void> {
    // Create a simple semaphore for concurrency control
    let activeCount = 0;
    const waiting: Array<() => void> = [];

    const acquireSemaphore = (): Promise<void> => {
      return new Promise((resolve) => {
        if (activeCount < SCRIPT_GENERATION_CONCURRENCY) {
          activeCount++;
          resolve();
        } else {
          waiting.push(resolve);
        }
      });
    };

    const releaseSemaphore = (): void => {
      activeCount--;
      const next = waiting.shift();
      if (next) {
        activeCount++;
        next();
      }
    };

    // Process a single plan with semaphore control
    const processPlan = async (plan: ScriptPlan, index: number): Promise<void> => {
      await acquireSemaphore();

      // Create script record with 'generating' status first (for progress tracking)
      const scriptRecord = await this.prisma.script.create({
        data: {
          batchId,
          status: 'generating',
          angle: plan.angle,
          duration: plan.duration,
        },
      });

      // Emit progress event for script starting
      const counts = await this.getScriptCounts(batchId, plans.length);
      this.notifications.emitScriptProgress({
        batchId,
        scriptId: scriptRecord.id,
        status: 'generating',
        ...counts,
      });

      try {
        this.logger.log(`Generating script ${index + 1}/${plans.length} (angle: ${plan.angle}, duration: ${plan.duration}s)`);

        let script = await this.generateScript(batch, plan, facts);

        // Validate groundedness and rewrite if needed (never rejects, only fixes)
        script = await this.validateAndRewriteIfNeeded(script, facts, batch);

        // Score the script
        const { score, warnings } = this.scoringService.scoreScript(
          script,
          forbiddenClaims,
        );

        // Apply style filter (language-based quality rules)
        const filterResult = await this.styleFilter.filterScript(
          {
            hook: script.hook,
            storyboard: script.storyboard.map((s) => ({
              spoken: s.spoken,
              onScreen: s.onScreen,
            })),
            ctaVariants: script.ctaVariants,
          },
          batch.project.language || 'en',
          'global',
          { allowedPromos: facts?.promos || [] },
        );

        // Log filter results for analysis (internal only - not user-visible)
        if (filterResult.violations.length > 0) {
          this.logger.warn(
            `Script ${index + 1} style violations: ${filterResult.violations.join(', ')}`,
          );
          // Don't add to user-visible warnings - internal logging only
        }

        // Validate beat count
        const beatWarning = validateBeatCount(script.storyboard, script.duration);
        if (beatWarning) {
          warnings.push(beatWarning);
        }

        // Update script with generated content
        await this.prisma.script.update({
          where: { id: scriptRecord.id },
          data: {
            status: 'completed',
            hook: script.hook,
            storyboard: script.storyboard,
            ctaVariants: script.ctaVariants,
            filmingChecklist: script.filmingChecklist,
            warnings: [...(script.warnings || []), ...warnings],
            score,
          },
        });

        this.logger.log(`Script ${index + 1}/${plans.length} completed (score: ${score})`);

        // Emit progress event for script completion
        const completedCounts = await this.getScriptCounts(batchId, plans.length);
        this.notifications.emitScriptProgress({
          batchId,
          scriptId: scriptRecord.id,
          status: 'completed',
          ...completedCounts,
        });
      } catch (error) {
        this.logger.error(`Failed to generate script ${index + 1}/${plans.length}: ${error}`);

        // Update script to failed status
        await this.prisma.script.update({
          where: { id: scriptRecord.id },
          data: {
            status: 'failed',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
          },
        });

        // Emit progress event for script failure
        const failedCounts = await this.getScriptCounts(batchId, plans.length);
        this.notifications.emitScriptProgress({
          batchId,
          scriptId: scriptRecord.id,
          status: 'failed',
          ...failedCounts,
        });
      } finally {
        releaseSemaphore();
      }
    };

    // Launch all plan processing in parallel (semaphore controls actual concurrency)
    await Promise.all(plans.map((plan, index) => processPlan(plan, index)));
  }

  /**
   * Get current script counts for progress tracking
   */
  private async getScriptCounts(batchId: string, totalCount: number) {
    const [completedCount, generatingCount] = await Promise.all([
      this.prisma.script.count({
        where: { batchId, status: 'completed' },
      }),
      this.prisma.script.count({
        where: { batchId, status: 'generating' },
      }),
    ]);

    return {
      completedCount,
      generatingCount,
      totalCount,
      progress: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
    };
  }

  /**
   * Detect if LLM response is a refusal rather than content.
   * Common refusal patterns from various models.
   */
  private isLlmRefusal(response: string): boolean {
    const refusalPatterns = [
      /^I('m| am) (sorry|unable|afraid)/i,
      /^I apologize/i,
      /^I cannot/i,
      /^Unfortunately/i,
      /^As an AI/i,
    ];
    return refusalPatterns.some(pattern => pattern.test(response.trim()));
  }

  private async repairJson(rawOutput: string, error: string): Promise<string> {
    const prompt = buildRepairPrompt(rawOutput, error);

    const response = await this.openRouter.chatCompletion(
      [
        { role: 'system', content: 'You repair JSON. Return only valid JSON.' },
        { role: 'user', content: prompt },
      ],
      { temperature: 0, jsonMode: true },
    );

    return this.stripMarkdown(response);
  }

  /**
   * Strip markdown code fences from LLM response.
   * Sonnet 4.5 tends to wrap JSON in ```json ... ``` blocks.
   */
  private stripMarkdown(content: string): string {
    let cleaned = content.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
    }
    return cleaned.trim();
  }

  /**
   * Process regeneration job from queue.
   * The script already exists with pending status and parentScriptId set.
   * @param scriptId - The new script being created
   * @param sourceScriptId - The script we're regenerating FROM (for content)
   * @param instruction - User's modification instructions
   */
  async processRegeneration(scriptId: string, sourceScriptId: string, instruction: string): Promise<void> {
    // Load script with full project context including personas
    const script = await this.prisma.script.findUnique({
      where: { id: scriptId },
      include: {
        batch: {
          include: {
            project: {
              include: {
                personas: true,
              },
            },
          },
        },
      },
    });

    if (!script) {
      throw new Error('Script not found');
    }

    // Fetch the source script (the one we're regenerating FROM)
    const sourceScript = await this.prisma.script.findUnique({
      where: { id: sourceScriptId },
    });

    if (!sourceScript || !sourceScript.storyboard) {
      throw new Error('Source script not found or invalid');
    }

    // Load grounding facts for quality parity with regular generation
    const facts = await this.groundednessService.getProjectFacts(script.batch.project.id);

    try {
      // Update status to generating
      await this.prisma.script.update({
        where: { id: scriptId },
        data: { status: 'generating' },
      });

      // Build rich prompt with full context (same quality as regular generation)
      const prompt = buildRegenerationPrompt({
        sourceScript: {
          angle: sourceScript.angle,
          duration: sourceScript.duration,
          hook: sourceScript.hook || '',
          storyboard: sourceScript.storyboard as Array<{
            t: string;
            shot: string;
            onScreen: string;
            spoken: string;
            broll?: string[];
          }>,
          ctaVariants: sourceScript.ctaVariants,
        },
        instruction,
        project: script.batch.project,
        facts,
        language: script.batch.project.language,
        region: script.batch.project.region,
      });

      // Use model based on batch quality
      const model = getModelForQuality(script.batch.quality);
      this.logger.log(`Regenerating script ${scriptId} with model ${model}`);

      let scriptOutput: ScriptOutput | null = null;

      for (let attempt = 1; attempt <= MAX_SCRIPT_RETRIES; attempt++) {
        try {
          const response = await this.openRouter.chatCompletion(
            [
              { role: 'system', content: 'You improve UGC scripts based on feedback while maintaining brand voice and factual accuracy. Always respond with valid JSON.' },
              { role: 'user', content: prompt },
            ],
            { model, temperature: 0.6, jsonMode: true },
          );

          if (this.isLlmRefusal(response)) {
            throw new Error('LLM refused to generate content');
          }

          try {
            scriptOutput = JSON.parse(response);
          } catch {
            const repaired = await this.repairJson(response, 'JSON parse error');
            scriptOutput = JSON.parse(repaired);
          }
          break; // Success, exit retry loop
        } catch (retryError) {
          if (attempt === MAX_SCRIPT_RETRIES) {
            throw retryError;
          }
          this.logger.warn(`Regeneration attempt ${attempt} failed, retrying: ${retryError instanceof Error ? retryError.message : 'Unknown error'}`);
        }
      }

      if (!scriptOutput) {
        throw new Error('Regeneration failed after all retries');
      }

      // Validate groundedness and rewrite if needed (same as regular generation)
      scriptOutput = await this.validateAndRewriteIfNeeded(scriptOutput, facts, script.batch);

      const { score, warnings } = this.scoringService.scoreScript(
        scriptOutput,
        script.batch.project.forbiddenClaims,
      );

      // Apply style filter
      const filterResult = await this.styleFilter.filterScript(
        {
          hook: scriptOutput.hook,
          storyboard: scriptOutput.storyboard.map((s) => ({
            spoken: s.spoken,
            onScreen: s.onScreen,
          })),
          ctaVariants: scriptOutput.ctaVariants,
        },
        script.batch.project.language || 'en',
        'global',
        { allowedPromos: facts?.promos || [] },
      );

      // Log filter results for analysis (internal only - not user-visible)
      if (filterResult.violations.length > 0) {
        this.logger.warn(
          `Regenerated script ${scriptId} style violations: ${filterResult.violations.join(', ')}`,
        );
        // Don't add to user-visible warnings - internal logging only
      }

      // Update the script with generated content
      await this.prisma.script.update({
        where: { id: scriptId },
        data: {
          status: 'completed',
          hook: scriptOutput.hook,
          storyboard: scriptOutput.storyboard,
          ctaVariants: scriptOutput.ctaVariants,
          filmingChecklist: scriptOutput.filmingChecklist,
          warnings: [...(scriptOutput.warnings || []), ...warnings],
          score,
        },
      });

      this.logger.log(`Regeneration completed for script ${scriptId}`);
    } catch (error) {
      this.logger.error(`Regeneration failed for script ${scriptId}: ${error}`);

      await this.prisma.script.update({
        where: { id: scriptId },
        data: {
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      // Refund the credit
      await this.creditsService.refund(
        script.batch.project.userId,
        CREDIT_COST_PER_SCRIPT,
        script.batchId,
        'Refund for failed regeneration',
      );

      this.logger.log(`Refunded ${CREDIT_COST_PER_SCRIPT} credit for failed regeneration of script ${scriptId}`);

      // Emit WebSocket event for frontend
      this.notifications.emitScriptProgress({
        batchId: script.batchId,
        scriptId,
        status: 'failed',
        completedCount: 0,
        generatingCount: 0,
        totalCount: 1,
        progress: 0,
      });

      throw error;
    }
  }

  // ============================================================
  // OVERGENERATION PIPELINE (Phase 2)
  // Generate → Filter → Rerank → Return Top N
  // ============================================================

  /**
   * Generate batch using overgeneration pipeline.
   * 1. Generate many hooks
   * 2. Filter and select top hooks
   * 3. Generate scripts from hooks in parallel
   * 4. Hard filter scripts that fail StylePolicy
   * 5. Rerank surviving scripts
   * 6. Return top N requested
   */
  async generateBatchWithOvergeneration(batchId: string): Promise<void> {
    const batch = await this.prisma.batch.findUnique({
      where: { id: batchId },
      include: {
        project: {
          include: {
            personas: true,
            facts: true,
          },
        },
        scripts: true,
      },
    });

    if (!batch) {
      throw new Error('Batch not found');
    }

    if (batch.status === 'completed') {
      this.logger.log(`Batch ${batchId} already completed, skipping`);
      return;
    }

    const quality = (batch.quality as 'standard' | 'premium') || 'standard';
    const totalRequested = batch.requestedCount;
    const anglesCount = Math.max(batch.angles.length, 1);
    const scriptsPerAngle = Math.ceil(totalRequested / anglesCount);

    // Validate batch doesn't exceed limits
    const validation = validateBatchRequest(scriptsPerAngle, anglesCount);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    try {
      await this.prisma.batch.update({
        where: { id: batchId },
        data: { status: 'processing' },
      });

      // Filter personas if specific ones were selected
      const filteredPersonas =
        batch.personaIds.length > 0
          ? batch.project.personas.filter((p) => batch.personaIds.includes(p.id))
          : batch.project.personas;

      const projectWithFilteredPersonas = {
        ...batch.project,
        personas: filteredPersonas,
      };

      this.logger.log(
        `[Overgen] Starting for batch ${batchId} (${quality} tier: ${scriptsPerAngle} scripts per angle × ${anglesCount} angles = ${totalRequested} final)`,
      );

      // Step 1: Generate and select hooks (stratified by angle)
      const hookResult = await this.hookGenerator.generateHooks(
        projectWithFilteredPersonas,
        {
          platform: batch.platform,
          angles: batch.angles,
          quality,
          scriptsPerAngle,
        },
      );

      this.logger.log(
        `[Overgen] Hook stats: ${hookResult.stats.generated} generated, ${hookResult.stats.passedFilter} passed filter, ${hookResult.stats.selected} selected`,
      );

      if (hookResult.selectedHooks.length === 0) {
        throw new Error('No hooks survived filtering');
      }

      // Step 2: Generate scripts from selected hooks (each hook has its angle)
      const generatedScripts = await this.generateScriptsFromHooks(
        hookResult.selectedHooks,
        batch,
        projectWithFilteredPersonas,
      );

      this.logger.log(`[Overgen] Generated ${generatedScripts.length} scripts`);

      // Step 3: Soft filter - check StylePolicy but keep ALL scripts
      // Scripts with violations get penalized in ranking but are never discarded
      const allowedPromos = batch.project.facts?.promos || [];
      const filterResult = await this.softFilterScripts(
        generatedScripts,
        projectWithFilteredPersonas.language || 'en',
        allowedPromos,
      );

      this.logger.log(
        `[Overgen] Style filter: ${filterResult.passedCount} clean, ${filterResult.failedCount} with violations (all kept)`,
      );

      const filteredScripts = filterResult.scripts;

      // Step 4: Rerank by quality scores
      const rankedScripts = this.rerankService.rerankScripts(
        filteredScripts,
        {
          productDescription: projectWithFilteredPersonas.productDescription,
          productName: projectWithFilteredPersonas.name,
          facts: batch.project.facts,
        },
        filteredPersonas,
      );

      // Step 5: Log quality statistics (no filtering - users paid for all scripts)
      // Scores are used for RANKING only, not elimination
      const lowScoring = rankedScripts.filter(
        (s) => s.scores.final < QUALITY_THRESHOLDS.minFinalScore,
      );
      if (lowScoring.length > 0) {
        this.logger.warn(
          `[Overgen] ${lowScoring.length}/${rankedScripts.length} scripts below quality threshold (${QUALITY_THRESHOLDS.minFinalScore}) - kept for delivery`,
        );
      }

      // Step 6: Select top N and save to database
      // IMPORTANT: Always return requestedCount - users paid for these scripts
      const targetCount = Math.min(batch.requestedCount, rankedScripts.length);
      const topScripts = rankedScripts.slice(0, targetCount);

      if (targetCount < batch.requestedCount) {
        this.logger.warn(
          `[Overgen] Only ${targetCount}/${batch.requestedCount} scripts generated - some generation may have failed`,
        );
      }

      this.logger.log(
        `[Overgen] Returning top ${targetCount} scripts. Score range: ${topScripts[0]?.scores.final} - ${topScripts[topScripts.length - 1]?.scores.final}`,
      );

      // Save selected scripts to database
      for (let i = 0; i < topScripts.length; i++) {
        const { script, scores } = topScripts[i];

        // Score with existing scoring service for filmability score
        const { score: filmabilityScore, warnings } = this.scoringService.scoreScript(
          script,
          batch.project.forbiddenClaims,
        );

        // Validate beat count
        const beatWarning = validateBeatCount(script.storyboard, script.duration);
        if (beatWarning) {
          warnings.push(beatWarning);
        }

        // Add user-facing warnings for filter violations
        if (script.filterViolations && script.filterViolations.length > 0) {
          warnings.push('Script contains phrases that may need review before use');
        }

        // Build analytics data for admin visibility
        const analyticsData = this.buildAnalyticsData(
          script,
          scores,
          i + 1, // batchPosition (1-indexed)
          generatedScripts.length,
          filteredScripts.length,
          script.filterViolations,
        );

        await this.prisma.script.create({
          data: {
            batchId,
            status: 'completed',
            angle: script.angle,
            duration: script.duration,
            hook: script.hook,
            storyboard: script.storyboard,
            ctaVariants: script.ctaVariants,
            filmingChecklist: script.filmingChecklist,
            warnings: [
              ...(script.warnings || []),
              ...warnings,
            ],
            score: filmabilityScore,
            analyticsData,
          },
        });
        // Progress already emitted during generation, no need to emit again during save
      }

      // Mark batch complete
      await this.prisma.batch.update({
        where: { id: batchId },
        data: { status: 'completed' },
      });

      this.notifications.emitBatchCompleted({
        batchId,
        projectId: batch.projectId,
        totalScripts: targetCount,
        completedScripts: topScripts.length,
        failedScripts: 0,
      });

      this.logger.log(`[Overgen] Batch ${batchId} completed successfully`);
    } catch (error) {
      this.logger.error(`[Overgen] Batch ${batchId} failed: ${error}`);

      await this.prisma.batch.update({
        where: { id: batchId },
        data: {
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      throw error;
    }
  }

  /**
   * Generate full scripts from selected hooks (parallel with concurrency control).
   * Each hook now includes its angle, so we use that instead of round-robin.
   */
  private async generateScriptsFromHooks(
    hooks: SelectedHook[],
    batch: Batch,
    project: Project & { personas: Persona[] },
  ): Promise<ScriptOutput[]> {
    const results: ScriptOutput[] = [];
    const model = getModelForQuality(batch.quality);
    const totalCount = hooks.length;
    let completedCount = 0;

    // Simple semaphore for concurrency control
    let activeCount = 0;
    const waiting: Array<() => void> = [];

    const acquireSemaphore = (): Promise<void> => {
      return new Promise((resolve) => {
        if (activeCount < SCRIPT_GENERATION_CONCURRENCY) {
          activeCount++;
          resolve();
        } else {
          waiting.push(resolve);
        }
      });
    };

    const releaseSemaphore = (): void => {
      activeCount--;
      const next = waiting.shift();
      if (next) {
        activeCount++;
        next();
      }
    };

    const generateFromHook = async (selectedHook: SelectedHook, index: number): Promise<ScriptOutput | null> => {
      await acquireSemaphore();

      try {
        // Use the angle from the hook (stratified selection ensures proper distribution)
        const duration = batch.durations[index % batch.durations.length];
        const angle = selectedHook.angle;
        const beatRange = getBeatRange(duration);

        const prompt = this.buildScriptFromHookPrompt(project, {
          hook: selectedHook.hook,
          angle,
          duration,
          beatRange,
          platform: batch.platform,
        });

        for (let attempt = 1; attempt <= MAX_SCRIPT_RETRIES; attempt++) {
          try {
            const response = await this.openRouter.chatCompletion(
              [
                { role: 'system', content: 'You are a UGC script writer. Always respond with valid JSON.' },
                { role: 'user', content: prompt },
              ],
              { model, temperature: 0.7, jsonMode: true },
            );

            if (this.isLlmRefusal(response)) {
              throw new Error('LLM refused to generate content');
            }

            try {
              const cleaned = this.stripMarkdown(response);
              const script = JSON.parse(cleaned) as ScriptOutput;

              // Emit progress during generation (not just during save)
              completedCount++;
              this.notifications.emitScriptProgress({
                batchId: batch.id,
                scriptId: `generating-${index}`,
                status: 'generating',
                completedCount,
                generatingCount: activeCount - 1, // -1 because this one just finished
                totalCount,
                progress: Math.round((completedCount / totalCount) * 100),
              });

              return script;
            } catch {
              this.logger.warn(`Failed to parse script for hook ${index + 1}, attempting repair`);
              const repaired = await this.repairJson(response, 'JSON parse error');
              const script = JSON.parse(repaired) as ScriptOutput;

              // Emit progress for repaired scripts too
              completedCount++;
              this.notifications.emitScriptProgress({
                batchId: batch.id,
                scriptId: `generating-${index}`,
                status: 'generating',
                completedCount,
                generatingCount: activeCount - 1,
                totalCount,
                progress: Math.round((completedCount / totalCount) * 100),
              });

              return script;
            }
          } catch (retryError) {
            if (attempt === MAX_SCRIPT_RETRIES) {
              throw retryError;
            }
            this.logger.warn(`Hook script attempt ${attempt} failed, retrying: ${retryError instanceof Error ? retryError.message : 'Unknown error'}`);
          }
        }
        return null; // Should not reach here
      } catch (error) {
        this.logger.error(`Failed to generate script from hook ${index + 1}: ${error}`);
        return null;
      } finally {
        releaseSemaphore();
      }
    };

    // Generate all scripts in parallel
    const scriptPromises = hooks.map((hook, index) => generateFromHook(hook, index));
    const scriptResults = await Promise.all(scriptPromises);

    // Filter out nulls (failed generations)
    for (const script of scriptResults) {
      if (script) {
        results.push(script);
      }
    }

    return results;
  }

  /**
   * Build prompt for generating a full script from a specific hook
   */
  private buildScriptFromHookPrompt(
    project: Project & { personas: Persona[] },
    settings: {
      hook: string;
      angle: string;
      duration: number;
      beatRange: { min: number; max: number };
      platform: string;
    },
  ): string {
    const personaContext = project.personas
      .map((p) => `${p.name}: ${p.description}`)
      .join('; ');

    const languageBlock = getLanguageInstruction(project.language, project.region);

    return `You are an expert UGC video ad script writer.

## Product
${project.productDescription}

${languageBlock}## Target Audience
${personaContext || 'General audience'}

${project.brandVoice ? `## Brand Voice\n${project.brandVoice}\n` : ''}
${project.forbiddenClaims.length ? `## FORBIDDEN (Never use these):\n${project.forbiddenClaims.map((c) => `- "${c}"`).join('\n')}\n` : ''}

## Task
Write a complete PAID AD script using this EXACT hook:
"${settings.hook}"

Angle: ${settings.angle}
Duration: ${settings.duration}s
Platform: ${settings.platform}

Return this EXACT JSON structure:
{
  "angle": "${settings.angle}",
  "duration": ${settings.duration},
  "hook": "${settings.hook}",
  "storyboard": [
    {
      "t": "0-3s",
      "shot": "What is in frame and the action",
      "onScreen": "Text overlay for this segment",
      "spoken": "Exact words the creator says",
      "broll": ["B-roll idea 1", "B-roll idea 2"]
    }
  ],
  "ctaVariants": ["CTA option 1", "CTA option 2", "CTA option 3"],
  "filmingChecklist": ["Filming instruction 1", "Props needed"],
  "warnings": []
}

REQUIREMENTS:
- Use the EXACT hook provided (do not modify it)
- Storyboard should have ${settings.beatRange.min}-${settings.beatRange.max} segments
- Time segments should add up to ~${settings.duration}s
- CTAs should match platform style

OUTPUT CONTRACT:
- Output must be valid JSON starting with '{' and ending with '}'
- Do NOT wrap in markdown fences
- Do NOT include any explanation`;
  }

  /**
   * Soft filter scripts - check StylePolicy but keep all scripts
   * Scripts that fail get filterViolations attached (used for ranking penalty)
   * No scripts are discarded - users paid for them, they get them
   */
  private async softFilterScripts(
    scripts: ScriptOutput[],
    language: string,
    allowedPromos: string[] = [],
  ): Promise<{ scripts: ScriptOutput[]; passedCount: number; failedCount: number }> {
    const result: ScriptOutput[] = [];
    let passedCount = 0;
    let failedCount = 0;

    for (const script of scripts) {
      const filterResult = await this.styleFilter.filterScript(
        {
          hook: script.hook,
          storyboard: script.storyboard.map((s) => ({
            spoken: s.spoken,
            onScreen: s.onScreen,
          })),
          ctaVariants: script.ctaVariants,
        },
        language,
        'global',
        { allowedPromos },
      );

      if (filterResult.passed) {
        result.push(script);
        passedCount++;
      } else {
        // Keep the script but attach violations for ranking penalty
        this.logger.debug(
          `[Overgen] Script has filter violations (kept with penalty): ${filterResult.violations.join(', ')}`,
        );
        result.push({
          ...script,
          filterViolations: filterResult.violations,
        });
        failedCount++;
      }
    }

    return { scripts: result, passedCount, failedCount };
  }

  /**
   * Build analytics data object for admin visibility
   * Includes all scoring details and batch context
   */
  private buildAnalyticsData(
    script: ScriptOutput,
    scores: RerankScores,
    batchPosition: number,
    totalGenerated: number,
    totalFiltered: number,
    filterViolations?: string[],
  ): Prisma.InputJsonObject {
    const hook = script.hook || '';
    const wordCount = hook.split(/\s+/).length;

    return {
      // Rerank scores (0-100 each)
      specificity: scores.specificity,
      novelty: scores.novelty,
      audienceFit: scores.audienceFit,
      hookStrength: scores.hookStrength,
      finalScore: scores.final,

      // Penalties applied
      penalties: {
        diversityPenalty: scores.diversityPenalty || 0,
        filterPenalty: scores.filterPenalty || 0,
      },

      // Filter violations (for admin review)
      filterViolations: filterViolations || [],

      // Hook metadata
      hookMeta: {
        wordCount,
        hasQuestion: hook.includes('?'),
        hasNumber: /\d+/.test(hook),
        powerWordsFound: this.findPowerWords(hook),
      },

      // Batch context
      batchPosition,
      totalGenerated,
      totalFiltered,

      // Timestamp for debugging
      scoredAt: new Date().toISOString(),
    };
  }

  /**
   * Find power words in hook for analytics
   */
  private findPowerWords(hook: string): string[] {
    const powerWords = [
      'stop', 'wait', 'secret', 'finally', 'never', 'always',
      'everyone', 'nobody', 'mistake', 'wrong', 'actually',
      'truth', 'real', 'honest',
    ];

    const hookLower = hook.toLowerCase();
    return powerWords.filter((w) => hookLower.includes(w));
  }
}
