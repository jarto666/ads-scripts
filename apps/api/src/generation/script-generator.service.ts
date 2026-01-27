import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OpenRouterClient } from './openrouter.client';
import {
  buildPass1Prompt,
  buildPass2Prompt,
  buildRepairPrompt,
} from './prompt-builder';
import { getLanguageInstruction } from './language-utils';
import { validateBeatCount } from './platform-profiles';
import { ScoringService } from './scoring.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { Project, Persona, Batch, Script } from '@prisma/client';

// Model configuration by quality tier
const QUALITY_MODELS = {
  standard: 'anthropic/claude-3.5-haiku',
  premium: 'anthropic/claude-3.5-sonnet',
} as const;

// Concurrency limit for parallel script generation
// Keep moderate to avoid rate limiting from LLM providers
const SCRIPT_GENERATION_CONCURRENCY = 4;

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
}

@Injectable()
export class ScriptGeneratorService {
  private readonly logger = new Logger(ScriptGeneratorService.name);

  constructor(
    private prisma: PrismaService,
    private openRouter: OpenRouterClient,
    private scoringService: ScoringService,
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

      // Pass 1: Generate plans (for remaining scripts only)
      this.logger.log(`Starting Pass 1 for batch ${batchId} with ${filteredPersonas.length} personas`);
      const plans = await this.generatePlans(batchWithFilteredProject);

      // Pass 2: Generate full scripts for each plan (in parallel with controlled concurrency)
      this.logger.log(`Starting Pass 2 for batch ${batchId}: ${plans.length} scripts (concurrency: ${SCRIPT_GENERATION_CONCURRENCY})`);

      // Process scripts in parallel with controlled concurrency
      await this.processPlansInParallel(
        plans,
        batchWithFilteredProject,
        batchId,
        batch.project.forbiddenClaims,
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
  ): Promise<ScriptPlan[]> {
    const prompt = buildPass1Prompt(batch.project, {
      platform: batch.platform,
      angles: batch.angles,
      durations: batch.durations,
      count: batch.requestedCount,
    });

    const model = QUALITY_MODELS[batch.quality as keyof typeof QUALITY_MODELS] || QUALITY_MODELS.standard;
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
      return plans as ScriptPlan[];
    } catch (error) {
      // Try to repair
      this.logger.warn('Pass 1 JSON parse failed, attempting repair');
      const repaired = await this.repairJson(response, error instanceof Error ? error.message : 'Unknown error');
      return JSON.parse(repaired) as ScriptPlan[];
    }
  }

  private async generateScript(
    batch: Batch & { project: Project & { personas: Persona[] } },
    plan: ScriptPlan,
  ): Promise<ScriptOutput> {
    const prompt = buildPass2Prompt(batch.project, plan, batch.platform);

    const model = QUALITY_MODELS[batch.quality as keyof typeof QUALITY_MODELS] || QUALITY_MODELS.standard;

    const response = await this.openRouter.chatCompletion(
      [
        { role: 'system', content: 'You are a UGC script writer. Always respond with valid JSON.' },
        { role: 'user', content: prompt },
      ],
      { model, temperature: 0.7, jsonMode: true },
    );

    try {
      return JSON.parse(response) as ScriptOutput;
    } catch (error) {
      // Try to repair
      this.logger.warn('Pass 2 JSON parse failed, attempting repair');
      const repaired = await this.repairJson(response, error instanceof Error ? error.message : 'Unknown error');
      return JSON.parse(repaired) as ScriptOutput;
    }
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

        const script = await this.generateScript(batch, plan);

        // Score the script
        const { score, warnings } = this.scoringService.scoreScript(
          script,
          forbiddenClaims,
        );

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

  private async repairJson(rawOutput: string, error: string): Promise<string> {
    const prompt = buildRepairPrompt(rawOutput, error);

    const response = await this.openRouter.chatCompletion(
      [
        { role: 'system', content: 'You repair JSON. Return only valid JSON.' },
        { role: 'user', content: prompt },
      ],
      { temperature: 0, jsonMode: true },
    );

    return response;
  }

  /**
   * Process regeneration job from queue.
   * The script already exists with pending status and parentScriptId set.
   * @param scriptId - The new script being created
   * @param sourceScriptId - The script we're regenerating FROM (for content)
   * @param instruction - User's modification instructions
   */
  async processRegeneration(scriptId: string, sourceScriptId: string, instruction: string): Promise<void> {
    const script = await this.prisma.script.findUnique({
      where: { id: scriptId },
      include: {
        batch: {
          include: {
            project: true,
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

    try {
      // Update status to generating
      await this.prisma.script.update({
        where: { id: scriptId },
        data: { status: 'generating' },
      });

      const languageBlock = getLanguageInstruction(
        script.batch.project.language,
        script.batch.project.region,
      );

      const prompt = `You are a UGC script writer. Modify the following script based on the instruction.

## Original Script
${JSON.stringify(sourceScript.storyboard, null, 2)}

Hook: ${sourceScript.hook}
CTAs: ${sourceScript.ctaVariants.join(', ')}

## Modification Instruction
${instruction}

## Product Context
${script.batch.project.productDescription}

${languageBlock}Return the modified script in the same JSON format:
{
  "angle": "${sourceScript.angle}",
  "duration": ${sourceScript.duration},
  "hook": "...",
  "storyboard": [...],
  "ctaVariants": [...],
  "filmingChecklist": [...],
  "warnings": [...]
}

Return ONLY valid JSON.`;

      // Use model based on batch quality
      const model = QUALITY_MODELS[script.batch.quality as keyof typeof QUALITY_MODELS] || QUALITY_MODELS.standard;
      this.logger.log(`Regenerating script ${scriptId} with model ${model}`);

      const response = await this.openRouter.chatCompletion(
        [
          { role: 'system', content: 'You modify UGC scripts. Always respond with valid JSON.' },
          { role: 'user', content: prompt },
        ],
        { model, temperature: 0.5, jsonMode: true },
      );

      let scriptOutput: ScriptOutput;
      try {
        scriptOutput = JSON.parse(response);
      } catch {
        const repaired = await this.repairJson(response, 'JSON parse error');
        scriptOutput = JSON.parse(repaired);
      }

      const { score, warnings } = this.scoringService.scoreScript(
        scriptOutput,
        script.batch.project.forbiddenClaims,
      );

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

      throw error;
    }
  }
}
