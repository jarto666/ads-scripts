import { Injectable } from '@nestjs/common';
import { StylePolicy } from '@prisma/client';
import { StyleFilterService } from './style-filter.service';

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

interface ScoreResult {
  score: number;
  warnings: string[];
}

@Injectable()
export class ScoringService {
  constructor(private styleFilter: StyleFilterService) {}

  async scoreScript(script: ScriptOutput, forbiddenClaims: string[], language = 'en'): Promise<ScoreResult> {
    const policy = await this.styleFilter.getPolicy(language);
    const warnings: string[] = [];

    // Hook Strength (0-20)
    const hookScore = this.scoreHookStrength(script.hook, policy);

    // Clarity & Structure (0-20)
    const clarityScore = this.scoreClarity(script, policy);

    // Visuality (0-20)
    const visualityScore = this.scoreVisuality(script.storyboard, policy);

    // Compliance (0-15)
    const { complianceScore, complianceWarnings } = this.scoreCompliance(
      script,
      forbiddenClaims,
    );
    warnings.push(...complianceWarnings);

    // Pacing (0-10)
    const pacingScore = this.scorePacing(script);

    // CTA Quality (0-10)
    const ctaScore = this.scoreCTAQuality(script.ctaVariants, policy);

    // Authenticity (0-5)
    const authenticityScore = this.scoreAuthenticity(script, policy);

    // Calculate total
    const totalScore =
      hookScore +
      clarityScore +
      visualityScore +
      complianceScore +
      pacingScore +
      ctaScore +
      authenticityScore;

    // Generate warnings for low-scoring areas
    // Format: user-friendly message that also works as regeneration instruction
    if (hookScore < 6) {
      warnings.push('Weak hook - add power words or a question to stop the scroll');
    }
    if (clarityScore < 10) {
      warnings.push('Benefits unclear - communicate value proposition earlier');
    }
    if (visualityScore < 10) {
      warnings.push('Vague storyboard - add specific, actionable shot descriptions');
    }
    if (pacingScore < 5) {
      warnings.push('Pacing issues - timing segments may not fit target duration');
    }
    if (ctaScore < 5) {
      warnings.push('Weak CTAs - make them more action-oriented and urgent');
    }
    if (script.storyboard.length < 3) {
      warnings.push('Storyboard too short - add more detail and scenes');
    }
    if (!script.filmingChecklist || script.filmingChecklist.length === 0) {
      warnings.push('Missing filming checklist');
    }

    return {
      score: Math.min(100, Math.max(0, Math.round(totalScore))),
      warnings,
    };
  }

  private scoreHookStrength(hook: string, policy?: StylePolicy | null): number {
    if (!hook) return 0;

    let score = 0;
    const hookLower = hook.toLowerCase();

    // Power words (0-6)
    const hookPowerWords = policy?.hookPowerWords ?? [];
    let powerWordCount = 0;
    for (const word of hookPowerWords) {
      if (hookLower.includes(word)) {
        powerWordCount++;
      }
    }
    score += Math.min(6, powerWordCount * 2);

    // Contains numbers/specifics (0-4)
    if (/\d+/.test(hook)) {
      score += 2;
    }
    if (/\d+%|\$\d+|\d+x|\d+\s*(days?|hours?|minutes?|seconds?|weeks?)/i.test(hook)) {
      score += 2; // Extra for specific metrics
    }

    // Question hook (0-3)
    if (hook.includes('?')) {
      score += 3;
    }

    // Direct address - "you/your" (0-3)
    if (/\byou\b|\byour\b/i.test(hook)) {
      score += 3;
    }

    // Length check - concise is better (0-4)
    const wordCount = hook.split(/\s+/).length;
    if (wordCount <= 8) {
      score += 4;
    } else if (wordCount <= 12) {
      score += 3;
    } else if (wordCount <= 15) {
      score += 1;
    }

    return Math.min(20, score);
  }

  private scoreClarity(script: ScriptOutput, policy?: StylePolicy | null): number {
    let score = 0;

    // Check first 2 storyboard steps for benefit language (0-10)
    const earlyContent =
      script.storyboard
        .slice(0, 2)
        .map((s) => `${s.spoken} ${s.onScreen}`)
        .join(' ')
        .toLowerCase() || '';

    const benefitWords = policy?.benefitWords ?? [];
    let benefitCount = 0;
    for (const keyword of benefitWords) {
      if (earlyContent.includes(keyword)) {
        benefitCount++;
      }
    }
    score += Math.min(10, benefitCount * 2);

    // Problem-solution structure (0-5)
    const allSpoken = script.storyboard.map((s) => s.spoken.toLowerCase()).join(' ');
    const hasProblem = /problem|struggle|tired of|hate|annoying|frustrat|difficult|hard to/i.test(allSpoken);
    const hasSolution = /solution|answer|finally|here's how|that's why|introducing/i.test(allSpoken);
    if (hasProblem && hasSolution) {
      score += 5;
    } else if (hasProblem || hasSolution) {
      score += 2;
    }

    // Has complete structure (0-5)
    const hasHook = script.hook && script.hook.length > 10;
    const hasBody = script.storyboard.length >= 3;
    const hasCTA = script.ctaVariants && script.ctaVariants.length > 0;
    if (hasHook && hasBody && hasCTA) {
      score += 5;
    } else if (hasHook && hasBody) {
      score += 3;
    }

    return Math.min(20, score);
  }

  private scoreVisuality(storyboard: ScriptOutput['storyboard'], policy?: StylePolicy | null): number {
    if (!storyboard || storyboard.length === 0) return 0;

    let score = 0;

    // Concrete action words in shots (0-10)
    const visualActionWords = policy?.visualActionWords ?? [];
    let concreteCount = 0;
    for (const step of storyboard) {
      const shotLower = step.shot.toLowerCase();
      for (const keyword of visualActionWords) {
        if (shotLower.includes(keyword)) {
          concreteCount++;
          break;
        }
      }
    }
    const concreteRatio = concreteCount / storyboard.length;
    score += Math.round(concreteRatio * 10);

    // Shot variety - not all the same (0-4)
    const uniqueShots = new Set(storyboard.map((s) => s.shot.toLowerCase().slice(0, 20)));
    const varietyRatio = uniqueShots.size / storyboard.length;
    score += Math.round(varietyRatio * 4);

    // Has b-roll suggestions (0-3)
    const brollCount = storyboard.filter((s) => s.broll && s.broll.length > 0).length;
    if (brollCount >= storyboard.length / 2) {
      score += 3;
    } else if (brollCount > 0) {
      score += 1;
    }

    // Adequate step count (0-3)
    if (storyboard.length >= 5) {
      score += 3;
    } else if (storyboard.length >= 4) {
      score += 2;
    } else if (storyboard.length >= 3) {
      score += 1;
    }

    return Math.min(20, score);
  }

  private scoreCompliance(
    script: ScriptOutput,
    forbiddenClaims: string[],
  ): { complianceScore: number; complianceWarnings: string[] } {
    const warnings: string[] = [];

    if (!forbiddenClaims || forbiddenClaims.length === 0) {
      return { complianceScore: 15, complianceWarnings: [] };
    }

    // Combine all text content
    const allText = [
      script.hook,
      ...script.storyboard.map((s) => `${s.spoken} ${s.onScreen}`),
      ...script.ctaVariants,
    ]
      .join(' ')
      .toLowerCase();

    let violations = 0;
    for (const claim of forbiddenClaims) {
      if (allText.includes(claim.toLowerCase())) {
        violations++;
        warnings.push(`Contains forbidden phrase: "${claim}"`);
      }
    }

    // Deduct points per violation
    const score = Math.max(0, 15 - violations * 5);

    return { complianceScore: score, complianceWarnings: warnings };
  }

  private scorePacing(script: ScriptOutput): number {
    if (!script.storyboard || script.storyboard.length === 0) return 0;

    let score = 0;

    // Parse timing and check if it roughly matches duration
    let totalParsedTime = 0;
    let validTimings = 0;

    for (const step of script.storyboard) {
      const timeMatch = step.t.match(/(\d+)\s*-\s*(\d+)/);
      if (timeMatch) {
        const start = parseInt(timeMatch[1]);
        const end = parseInt(timeMatch[2]);
        totalParsedTime = Math.max(totalParsedTime, end);
        validTimings++;
      }
    }

    // All steps have valid timing format (0-4)
    const timingRatio = validTimings / script.storyboard.length;
    score += Math.round(timingRatio * 4);

    // Timing roughly matches target duration (0-6)
    if (totalParsedTime > 0) {
      const durationMatch = Math.abs(totalParsedTime - script.duration) / script.duration;
      if (durationMatch <= 0.1) {
        score += 6; // Within 10%
      } else if (durationMatch <= 0.2) {
        score += 4; // Within 20%
      } else if (durationMatch <= 0.3) {
        score += 2; // Within 30%
      }
    }

    return Math.min(10, score);
  }

  private scoreCTAQuality(ctaVariants: string[], policy?: StylePolicy | null): number {
    if (!ctaVariants || ctaVariants.length === 0) return 0;

    let score = 0;

    // Has multiple CTA options (0-3)
    if (ctaVariants.length >= 3) {
      score += 3;
    } else if (ctaVariants.length >= 2) {
      score += 2;
    } else {
      score += 1;
    }

    // CTAs contain action words (0-4)
    const ctaActionWords = policy?.ctaActionWords ?? [];
    let actionCount = 0;
    for (const cta of ctaVariants) {
      const ctaLower = cta.toLowerCase();
      for (const word of ctaActionWords) {
        if (ctaLower.includes(word)) {
          actionCount++;
          break;
        }
      }
    }
    score += Math.min(4, Math.round((actionCount / ctaVariants.length) * 4));

    // CTAs contain urgency (0-3)
    const ctaUrgencyWords = policy?.ctaUrgencyWords ?? [];
    let urgencyCount = 0;
    for (const cta of ctaVariants) {
      const ctaLower = cta.toLowerCase();
      for (const word of ctaUrgencyWords) {
        if (ctaLower.includes(word)) {
          urgencyCount++;
          break;
        }
      }
    }
    if (urgencyCount > 0) {
      score += Math.min(3, urgencyCount);
    }

    return Math.min(10, score);
  }

  private scoreAuthenticity(script: ScriptOutput, policy?: StylePolicy | null): number {
    // Combine all text
    const allText = [
      script.hook,
      ...script.storyboard.map((s) => `${s.spoken} ${s.onScreen}`),
      ...script.ctaVariants,
    ]
      .join(' ')
      .toLowerCase();

    let score = 5; // Start with full points

    // Deduct for corporate/LLM-smell phrases (from DB)
    const llmSmell = policy?.clicheLlmSmell ?? [];
    for (const phrase of llmSmell) {
      if (allText.includes(phrase)) {
        score -= 1;
      }
    }

    // Bonus for conversational markers (from DB)
    const markers = policy?.conversationalMarkers ?? [];
    let conversationalCount = 0;
    for (const marker of markers) {
      if (allText.includes(marker)) {
        conversationalCount++;
      }
    }
    if (conversationalCount > 0 && score < 5) {
      score += Math.min(2, conversationalCount);
    }

    return Math.max(0, Math.min(5, score));
  }
}
