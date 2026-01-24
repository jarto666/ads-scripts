import { Injectable } from '@nestjs/common';

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
  scoreScript(script: ScriptOutput, forbiddenClaims: string[]): ScoreResult {
    const warnings: string[] = [];
    let score = 0;

    // Hook strength (0-25)
    score += this.scoreHookStrength(script.hook);

    // Clarity - benefit stated early (0-25)
    score += this.scoreClarity(script);

    // Visuality - concrete storyboard steps (0-25)
    score += this.scoreVisuality(script.storyboard);

    // Compliance - forbidden phrases absent (0-25)
    const { complianceScore, complianceWarnings } = this.scoreCompliance(
      script,
      forbiddenClaims,
    );
    score += complianceScore;
    warnings.push(...complianceWarnings);

    // Additional warnings
    if (!script.ctaVariants || script.ctaVariants.length === 0) {
      warnings.push('Missing CTA variants');
    }

    if (!script.filmingChecklist || script.filmingChecklist.length === 0) {
      warnings.push('Missing filming checklist');
    }

    if (script.storyboard.length < 3) {
      warnings.push('Storyboard too short - needs more detail');
    }

    return {
      score: Math.min(100, Math.max(0, Math.round(score))),
      warnings,
    };
  }

  private scoreHookStrength(hook: string): number {
    if (!hook) return 0;

    let score = 0;
    const hookLower = hook.toLowerCase();

    // Contains specific pain point or contrast
    if (
      hookLower.includes('stop') ||
      hookLower.includes('wait') ||
      hookLower.includes('but') ||
      hookLower.includes('if you') ||
      hookLower.includes("don't")
    ) {
      score += 8;
    }

    // Contains numbers or specifics
    if (/\d+/.test(hook)) {
      score += 7;
    }

    // Is a question (engagement)
    if (hook.includes('?')) {
      score += 5;
    }

    // Not too long (under 15 words)
    const wordCount = hook.split(/\s+/).length;
    if (wordCount <= 10) {
      score += 5;
    } else if (wordCount <= 15) {
      score += 3;
    }

    return Math.min(25, score);
  }

  private scoreClarity(script: ScriptOutput): number {
    let score = 0;

    // Check if benefit is mentioned early (first 2 storyboard steps)
    const earlyContent =
      script.storyboard
        .slice(0, 2)
        .map((s) => `${s.spoken} ${s.onScreen}`)
        .join(' ')
        .toLowerCase() || '';

    // Benefit-oriented keywords
    const benefitKeywords = [
      'get',
      'achieve',
      'transform',
      'easy',
      'quick',
      'simple',
      'finally',
      'save',
      'help',
      'solve',
      'fix',
      'stop',
      'end',
      'no more',
    ];

    let benefitCount = 0;
    for (const keyword of benefitKeywords) {
      if (earlyContent.includes(keyword)) {
        benefitCount++;
      }
    }

    score += Math.min(15, benefitCount * 5);

    // Clear structure (has hook, body, CTA)
    if (script.hook && script.storyboard.length >= 3 && script.ctaVariants.length > 0) {
      score += 10;
    }

    return Math.min(25, score);
  }

  private scoreVisuality(
    storyboard: ScriptOutput['storyboard'],
  ): number {
    if (!storyboard || storyboard.length === 0) return 0;

    let score = 0;

    // Check for concrete shot descriptions
    const concreteKeywords = [
      'show',
      'hold',
      'point',
      'look',
      'grab',
      'pick',
      'put',
      'place',
      'close-up',
      'closeup',
      'wide',
      'pan',
      'zoom',
      'face',
      'hands',
      'product',
    ];

    let concreteCount = 0;
    for (const step of storyboard) {
      const shotLower = step.shot.toLowerCase();
      for (const keyword of concreteKeywords) {
        if (shotLower.includes(keyword)) {
          concreteCount++;
          break;
        }
      }
    }

    // Concrete shot descriptions
    score += Math.min(15, (concreteCount / storyboard.length) * 15);

    // Has b-roll suggestions
    const brollCount = storyboard.filter(
      (s) => s.broll && s.broll.length > 0,
    ).length;
    if (brollCount > 0) {
      score += 5;
    }

    // Adequate number of steps for duration
    if (storyboard.length >= 4) {
      score += 5;
    }

    return Math.min(25, score);
  }

  private scoreCompliance(
    script: ScriptOutput,
    forbiddenClaims: string[],
  ): { complianceScore: number; complianceWarnings: string[] } {
    const warnings: string[] = [];

    if (!forbiddenClaims || forbiddenClaims.length === 0) {
      return { complianceScore: 25, complianceWarnings: [] };
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
    const score = Math.max(0, 25 - violations * 8);

    return { complianceScore: score, complianceWarnings: warnings };
  }
}
