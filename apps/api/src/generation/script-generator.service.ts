import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OpenRouterClient } from './openrouter.client';
import {
  buildPass1Prompt,
  buildPass2Prompt,
  buildRepairPrompt,
} from './prompt-builder';
import { validateBeatCount } from './platform-profiles';
import { ScoringService } from './scoring.service';
import { Project, Persona, Batch, Script } from '@prisma/client';

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

      // Pass 2: Generate full scripts for each plan
      this.logger.log(`Starting Pass 2 for batch ${batchId}: ${plans.length} scripts`);

      for (const plan of plans) {
        try {
          const script = await this.generateScript(batchWithFilteredProject, plan);

          // Score the script
          const { score, warnings } = this.scoringService.scoreScript(
            script,
            batch.project.forbiddenClaims,
          );

          // Validate beat count
          const beatWarning = validateBeatCount(script.storyboard, script.duration);
          if (beatWarning) {
            warnings.push(beatWarning);
          }

          // Save to database
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
              warnings: [...(script.warnings || []), ...warnings],
              score,
            },
          });
        } catch (error) {
          this.logger.error(`Failed to generate script for plan: ${error}`);

          // Save failed script
          await this.prisma.script.create({
            data: {
              batchId,
              status: 'failed',
              angle: plan.angle,
              duration: plan.duration,
              errorMessage: error instanceof Error ? error.message : 'Unknown error',
            },
          });
        }
      }

      // Update batch status
      await this.prisma.batch.update({
        where: { id: batchId },
        data: { status: 'completed' },
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

    const response = await this.openRouter.chatCompletion(
      [
        { role: 'system', content: 'You are a UGC script planning assistant. Always respond with valid JSON.' },
        { role: 'user', content: prompt },
      ],
      { temperature: 0.7, jsonMode: true },
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

    const response = await this.openRouter.chatCompletion(
      [
        { role: 'system', content: 'You are a UGC script writer. Always respond with valid JSON.' },
        { role: 'user', content: prompt },
      ],
      { temperature: 0.7, jsonMode: true },
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

  async regenerateScript(
    scriptId: string,
    instruction: string,
  ): Promise<Script> {
    const existingScript = await this.prisma.script.findUnique({
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

    if (!existingScript || !existingScript.storyboard) {
      throw new Error('Script not found or invalid');
    }

    const prompt = `You are a UGC script writer. Modify the following script based on the instruction.

## Original Script
${JSON.stringify(existingScript.storyboard, null, 2)}

Hook: ${existingScript.hook}
CTAs: ${existingScript.ctaVariants.join(', ')}

## Modification Instruction
${instruction}

## Product Context
${existingScript.batch.project.productDescription}

Return the modified script in the same JSON format:
{
  "angle": "${existingScript.angle}",
  "duration": ${existingScript.duration},
  "hook": "...",
  "storyboard": [...],
  "ctaVariants": [...],
  "filmingChecklist": [...],
  "warnings": [...]
}

Return ONLY valid JSON.`;

    const response = await this.openRouter.chatCompletion(
      [
        { role: 'system', content: 'You modify UGC scripts. Always respond with valid JSON.' },
        { role: 'user', content: prompt },
      ],
      { temperature: 0.5, jsonMode: true },
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
      existingScript.batch.project.forbiddenClaims,
    );

    // Create new script (don't overwrite original)
    return this.prisma.script.create({
      data: {
        batchId: existingScript.batchId,
        status: 'completed',
        angle: scriptOutput.angle,
        duration: scriptOutput.duration,
        hook: scriptOutput.hook,
        storyboard: scriptOutput.storyboard,
        ctaVariants: scriptOutput.ctaVariants,
        filmingChecklist: scriptOutput.filmingChecklist,
        warnings: [...(scriptOutput.warnings || []), ...warnings],
        score,
      },
    });
  }
}
