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

// Power words that create urgency, curiosity, or emotional response
const HOOK_POWER_WORDS = [
  // Stop-scroll patterns
  'stop', 'wait', 'hold on', 'pause', 'listen',
  // Conditional hooks
  'if you', "if you're", 'when you', 'ever wonder',
  // Contrast/objection
  'but', 'however', 'actually', 'truth is', 'reality is',
  // Urgency
  "don't", 'never', 'avoid', 'mistake', 'wrong',
  // Curiosity
  'secret', 'hidden', 'nobody tells', 'what if', 'imagine',
  // Social proof
  'everyone', 'people are', 'went viral', 'obsessed',
  // Direct challenge
  'bet you', 'prove me wrong', 'change my mind',
  // Story hooks
  'story time', 'true story', 'confession', 'finally',
  // Results
  'works', 'changed', 'discovered', 'found', 'realized',
];

// Words indicating benefits and transformation
const BENEFIT_WORDS = [
  // Achievement
  'get', 'achieve', 'unlock', 'gain', 'earn', 'win',
  // Transformation
  'transform', 'change', 'become', 'turn into', 'upgrade',
  // Ease
  'easy', 'simple', 'quick', 'fast', 'instant', 'effortless',
  // Relief
  'finally', 'no more', 'goodbye', 'forget', 'stop struggling',
  // Value
  'save', 'free', 'bonus', 'extra', 'included',
  // Help
  'help', 'solve', 'fix', 'cure', 'heal', 'improve',
  // Results
  'results', 'outcome', 'difference', 'impact', 'effect',
  // Emotion
  'love', 'enjoy', 'amazing', 'incredible', 'perfect',
  // Time
  'minutes', 'seconds', 'hours', 'days', 'weeks', 'overnight',
];

// Concrete visual/action words for storyboard
const VISUAL_ACTION_WORDS = [
  // Camera actions
  'show', 'reveal', 'display', 'present', 'demonstrate',
  // Physical actions
  'hold', 'grab', 'pick up', 'put down', 'place', 'set',
  'open', 'close', 'pour', 'apply', 'use', 'try',
  // Camera angles/moves
  'close-up', 'closeup', 'close up', 'wide shot', 'medium shot',
  'pan', 'zoom', 'tilt', 'track', 'follow',
  // Body parts (for UGC authenticity)
  'face', 'hands', 'eyes', 'smile', 'reaction', 'expression',
  // Product focus
  'product', 'package', 'box', 'bottle', 'label', 'texture',
  // Pointing/directing
  'point', 'gesture', 'look at', 'focus on', 'highlight',
  // Transitions
  'cut to', 'transition', 'switch', 'move to',
];

// CTA action verbs
const CTA_ACTION_WORDS = [
  'click', 'tap', 'get', 'grab', 'shop', 'buy', 'order',
  'try', 'start', 'join', 'sign up', 'subscribe', 'follow',
  'check out', 'discover', 'learn', 'see', 'find out',
  'claim', 'unlock', 'access', 'download', 'save',
];

// Urgency words for CTAs
const CTA_URGENCY_WORDS = [
  'now', 'today', 'limited', 'exclusive', 'only', 'last chance',
  'hurry', 'fast', 'quick', 'before', 'while', 'ending',
  "don't miss", "don't wait", 'act now', 'right now',
];

// Corporate/inauthentic phrases to avoid
const CORPORATE_PHRASES = [
  'leverage', 'synergy', 'optimize', 'utilize', 'facilitate',
  'comprehensive solution', 'cutting-edge', 'state-of-the-art',
  'industry-leading', 'best-in-class', 'world-class',
  'revolutionary', 'groundbreaking', 'game-changing',
  'paradigm shift', 'holistic approach', 'robust',
];

@Injectable()
export class ScoringService {
  scoreScript(script: ScriptOutput, forbiddenClaims: string[]): ScoreResult {
    const warnings: string[] = [];

    // Hook Strength (0-20)
    const hookScore = this.scoreHookStrength(script.hook);

    // Clarity & Structure (0-20)
    const clarityScore = this.scoreClarity(script);

    // Visuality (0-20)
    const visualityScore = this.scoreVisuality(script.storyboard);

    // Compliance (0-15)
    const { complianceScore, complianceWarnings } = this.scoreCompliance(
      script,
      forbiddenClaims,
    );
    warnings.push(...complianceWarnings);

    // Pacing (0-10)
    const pacingScore = this.scorePacing(script);

    // CTA Quality (0-10)
    const ctaScore = this.scoreCTAQuality(script.ctaVariants);

    // Authenticity (0-5)
    const authenticityScore = this.scoreAuthenticity(script);

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
    if (hookScore < 10) {
      warnings.push('Hook could be stronger - try adding power words or a question');
    }
    if (clarityScore < 10) {
      warnings.push('Benefits not clearly communicated early in the script');
    }
    if (visualityScore < 10) {
      warnings.push('Storyboard needs more specific, actionable shot descriptions');
    }
    if (pacingScore < 5) {
      warnings.push('Timing segments may not match target duration');
    }
    if (ctaScore < 5) {
      warnings.push('CTAs could be more action-oriented or urgent');
    }
    if (script.storyboard.length < 3) {
      warnings.push('Storyboard too short - needs more detail');
    }
    if (!script.filmingChecklist || script.filmingChecklist.length === 0) {
      warnings.push('Missing filming checklist');
    }

    return {
      score: Math.min(100, Math.max(0, Math.round(totalScore))),
      warnings,
    };
  }

  private scoreHookStrength(hook: string): number {
    if (!hook) return 0;

    let score = 0;
    const hookLower = hook.toLowerCase();

    // Power words (0-6)
    let powerWordCount = 0;
    for (const word of HOOK_POWER_WORDS) {
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

  private scoreClarity(script: ScriptOutput): number {
    let score = 0;

    // Check first 2 storyboard steps for benefit language (0-10)
    const earlyContent =
      script.storyboard
        .slice(0, 2)
        .map((s) => `${s.spoken} ${s.onScreen}`)
        .join(' ')
        .toLowerCase() || '';

    let benefitCount = 0;
    for (const keyword of BENEFIT_WORDS) {
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

  private scoreVisuality(storyboard: ScriptOutput['storyboard']): number {
    if (!storyboard || storyboard.length === 0) return 0;

    let score = 0;

    // Concrete action words in shots (0-10)
    let concreteCount = 0;
    for (const step of storyboard) {
      const shotLower = step.shot.toLowerCase();
      for (const keyword of VISUAL_ACTION_WORDS) {
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

  private scoreCTAQuality(ctaVariants: string[]): number {
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
    let actionCount = 0;
    for (const cta of ctaVariants) {
      const ctaLower = cta.toLowerCase();
      for (const word of CTA_ACTION_WORDS) {
        if (ctaLower.includes(word)) {
          actionCount++;
          break;
        }
      }
    }
    score += Math.min(4, Math.round((actionCount / ctaVariants.length) * 4));

    // CTAs contain urgency (0-3)
    let urgencyCount = 0;
    for (const cta of ctaVariants) {
      const ctaLower = cta.toLowerCase();
      for (const word of CTA_URGENCY_WORDS) {
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

  private scoreAuthenticity(script: ScriptOutput): number {
    // Combine all text
    const allText = [
      script.hook,
      ...script.storyboard.map((s) => `${s.spoken} ${s.onScreen}`),
      ...script.ctaVariants,
    ]
      .join(' ')
      .toLowerCase();

    let score = 5; // Start with full points

    // Deduct for corporate speak
    for (const phrase of CORPORATE_PHRASES) {
      if (allText.includes(phrase)) {
        score -= 1;
      }
    }

    // Bonus for conversational markers (cap at 5)
    const conversationalMarkers = [
      'honestly', 'literally', 'actually', 'okay so', 'like',
      'you guys', 'y\'all', 'real talk', 'no joke', 'trust me',
      'i mean', 'right?', 'you know',
    ];
    let conversationalCount = 0;
    for (const marker of conversationalMarkers) {
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
