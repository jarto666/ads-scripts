import { Injectable, Logger } from '@nestjs/common';
import { Persona } from '@prisma/client';

/**
 * Rerank scoring weights (must sum to 1.0)
 */
const WEIGHTS = {
  specificity: 0.3,
  novelty: 0.25,
  audienceFit: 0.25,
  hookStrength: 0.2,
};

/**
 * Score breakdown for transparency/debugging
 */
export interface RerankScores {
  specificity: number;
  novelty: number;
  audienceFit: number;
  hookStrength: number;
  final: number;
}

/**
 * Script with rerank score attached
 */
export interface RankedScript<T> {
  script: T;
  scores: RerankScores;
}

/**
 * Script content for scoring
 */
interface ScriptContent {
  hook: string;
  storyboard: Array<{
    spoken?: string;
    onScreen?: string;
  }>;
  ctaVariants: string[];
}

/**
 * Product context for specificity scoring
 */
interface ProductContext {
  productDescription: string;
  productName?: string;
}

/**
 * Generic phrases that indicate non-specific content
 */
const GENERIC_PHRASES = [
  "you won't believe",
  "here's why",
  "here's how",
  "the thing is",
  "real talk",
  "no cap",
  "it's giving",
  'this changed my life',
  'you need this',
  'best thing ever',
  'so amazing',
  'absolutely love',
  'obsessed with',
];

/**
 * Soft patterns to penalize (not hard blocks, but reduce novelty score)
 */
const SOFT_AVOID_PATTERNS = [
  { pattern: /(?:^|\.\s+)so\s/i, name: 'starts with So...' },
  { pattern: /\?.*\?.*\?/g, name: 'excessive questions' },
  { pattern: /\byou guys\b.*\byou guys\b/i, name: 'repeated you guys' },
  { pattern: /right\?\s*$/i, name: 'ends with Right?' },
  { pattern: /^okay so\b/i, name: 'starts with Okay so' },
];

/**
 * Power words that make hooks stronger
 */
const HOOK_POWER_WORDS = [
  'stop',
  'wait',
  'secret',
  'finally',
  'never',
  'always',
  'everyone',
  'nobody',
  'mistake',
  'wrong',
  'actually',
  'truth',
  'real',
  'honest',
];

/**
 * Cliché hook starters that are overused and should be penalized
 */
const CLICHE_HOOK_STARTERS = [
  "here's the thing",
  "here's why",
  "here's how",
  'i kept seeing',
  "everyone's been asking",
  'pov: you finally',
  'nobody talks about',
  'stop scrolling if',
  'this changed everything',
  'game changer',
  'life changer',
  'wait until you see',
  'you need to see this',
];

@Injectable()
export class RerankService {
  private readonly logger = new Logger(RerankService.name);

  /**
   * Rerank scripts by quality scores and return sorted list
   */
  rerankScripts<T extends ScriptContent>(
    scripts: T[],
    productContext: ProductContext,
    personas: Persona[],
  ): RankedScript<T>[] {
    const ranked = scripts.map((script) => {
      const scores = this.scoreScript(script, productContext, personas);
      return { script, scores };
    });

    // Sort by final score descending
    ranked.sort((a, b) => b.scores.final - a.scores.final);

    this.logger.log(
      `Reranked ${scripts.length} scripts. Top score: ${ranked[0]?.scores.final || 0}, Bottom: ${ranked[ranked.length - 1]?.scores.final || 0}`,
    );

    return ranked;
  }

  /**
   * Score a single script across all dimensions
   */
  scoreScript(
    script: ScriptContent,
    productContext: ProductContext,
    personas: Persona[],
  ): RerankScores {
    const specificity = this.scoreSpecificity(script, productContext);
    const novelty = this.scoreNovelty(script);
    const audienceFit = this.scoreAudienceFit(script, personas);
    const hookStrength = this.scoreHookStrength(script.hook);

    const final = Math.round(
      specificity * WEIGHTS.specificity +
        novelty * WEIGHTS.novelty +
        audienceFit * WEIGHTS.audienceFit +
        hookStrength * WEIGHTS.hookStrength,
    );

    return {
      specificity,
      novelty,
      audienceFit,
      hookStrength,
      final,
    };
  }

  /**
   * Score hook strength (also used for hook selection)
   */
  scoreHookStrength(hook: string): number {
    if (!hook) return 0;

    let score = 0;
    const hookLower = hook.toLowerCase();

    // 0. Penalize cliché hook starters (-15 each)
    for (const cliche of CLICHE_HOOK_STARTERS) {
      if (hookLower.startsWith(cliche) || hookLower.includes(cliche)) {
        score -= 15;
        break; // Only penalize once
      }
    }

    // 1. Length check: 6-14 words optimal (0-20)
    const wordCount = hook.split(/\s+/).length;
    if (wordCount >= 6 && wordCount <= 14) {
      score += 20;
    } else if (wordCount >= 4 && wordCount <= 18) {
      score += 10;
    }

    // 2. Contains question (0-15)
    if (hook.includes('?')) {
      score += 15;
    }

    // 3. Direct address "you/your" (0-15)
    if (/\byou\b|\byour\b/i.test(hook)) {
      score += 15;
    }

    // 4. Contains number/specificity (0-15)
    if (/\d+/.test(hook)) {
      score += 15;
    }

    // 5. Power words present (0-20)
    let powerWordCount = 0;
    for (const word of HOOK_POWER_WORDS) {
      if (hookLower.includes(word)) {
        powerWordCount++;
      }
    }
    score += Math.min(20, powerWordCount * 7);

    // 6. Emotional/curiosity trigger (0-15)
    const emotionalPatterns = [
      /\b(tired|sick|frustrated|hate|love|obsessed|scared|stressed)\b/i,
      /\b(secret|hidden|truth|real|honest)\b/i,
      /\b(stop|wait|don't|never|always)\b/i,
    ];
    for (const pattern of emotionalPatterns) {
      if (pattern.test(hook)) {
        score += 5;
      }
    }

    return Math.min(100, score);
  }

  /**
   * Specificity: How much the script uses actual product details
   * Uses productDescription keywords as proxy until ProjectFacts exists
   */
  private scoreSpecificity(
    script: ScriptContent,
    productContext: ProductContext,
  ): number {
    const text = this.extractText(script).toLowerCase();
    const productDesc = productContext.productDescription.toLowerCase();

    // Extract significant keywords from product description
    const keywords = this.extractKeywords(productDesc);
    if (keywords.length === 0) return 50; // Default if no keywords

    // Count how many product keywords appear in the script
    let matchCount = 0;
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        matchCount++;
      }
    }

    // Base score from keyword matches (0-60)
    const matchRatio = matchCount / Math.min(keywords.length, 10);
    let score = Math.round(matchRatio * 60);

    // Bonus for product name mention (0-20)
    if (productContext.productName) {
      const productNameLower = productContext.productName.toLowerCase();
      if (text.includes(productNameLower)) {
        score += 20;
      }
    }

    // Bonus for specific numbers/metrics from product (0-20)
    const productNumbers = productDesc.match(/\d+(?:\.\d+)?(?:\s*[%xX]|\s*(?:minutes?|seconds?|hours?|days?))?/g) || [];
    const scriptNumbers = text.match(/\d+(?:\.\d+)?(?:\s*[%xX]|\s*(?:minutes?|seconds?|hours?|days?))?/g) || [];

    for (const num of scriptNumbers) {
      if (productNumbers.some((pn) => pn.includes(num) || num.includes(pn))) {
        score += 10;
        break;
      }
    }

    return Math.min(100, score);
  }

  /**
   * Novelty: How non-generic and fresh the script sounds
   */
  private scoreNovelty(script: ScriptContent): number {
    const text = this.extractText(script);
    const textLower = text.toLowerCase();
    let score = 100;

    // Deduct for generic phrases
    for (const phrase of GENERIC_PHRASES) {
      if (textLower.includes(phrase)) {
        score -= 12;
      }
    }

    // Deduct for soft-avoid patterns
    for (const { pattern } of SOFT_AVOID_PATTERNS) {
      if (pattern.test(text)) {
        score -= 8;
      }
    }

    // Deduct for excessive "you" addressing (more than 6 = pushy)
    const youCount = (text.match(/\byou\b/gi) || []).length;
    if (youCount > 6) {
      score -= (youCount - 6) * 4;
    }

    // Deduct for all caps words (more than 2 = shouty)
    const capsWords = (text.match(/\b[A-Z]{2,}\b/g) || []).length;
    if (capsWords > 2) {
      score -= (capsWords - 2) * 5;
    }

    // Deduct for excessive exclamation marks
    const exclamations = (text.match(/!/g) || []).length;
    if (exclamations > 3) {
      score -= (exclamations - 3) * 5;
    }

    return Math.max(0, score);
  }

  /**
   * Audience Fit: How well the script addresses persona pain points and desires
   */
  private scoreAudienceFit(script: ScriptContent, personas: Persona[]): number {
    if (!personas || personas.length === 0) return 50; // Default if no personas

    const text = this.extractText(script).toLowerCase();
    let score = 0;

    // Collect all pain points and desires from personas
    const painPoints: string[] = [];
    const desires: string[] = [];

    for (const persona of personas) {
      if (Array.isArray(persona.painPoints)) {
        painPoints.push(...persona.painPoints);
      }
      if (Array.isArray(persona.desires)) {
        desires.push(...persona.desires);
      }
    }

    // Score pain point mentions (0-50)
    let painHits = 0;
    for (const pain of painPoints) {
      if (this.textContainsKeywords(text, pain)) {
        painHits++;
      }
    }
    const painTarget = Math.min(painPoints.length, 5);
    if (painTarget > 0) {
      score += Math.min(50, Math.round((painHits / painTarget) * 50));
    } else {
      score += 25; // Default if no pain points defined
    }

    // Score desire mentions (0-50)
    let desireHits = 0;
    for (const desire of desires) {
      if (this.textContainsKeywords(text, desire)) {
        desireHits++;
      }
    }
    const desireTarget = Math.min(desires.length, 5);
    if (desireTarget > 0) {
      score += Math.min(50, Math.round((desireHits / desireTarget) * 50));
    } else {
      score += 25; // Default if no desires defined
    }

    return Math.min(100, score);
  }

  /**
   * Extract all text content from a script
   */
  private extractText(script: ScriptContent): string {
    const parts: string[] = [
      script.hook || '',
      ...(script.storyboard || []).map((s) => `${s.spoken || ''} ${s.onScreen || ''}`),
      ...(script.ctaVariants || []),
    ];
    return parts.join(' ');
  }

  /**
   * Extract significant keywords from text (nouns, verbs, product-specific terms)
   */
  private extractKeywords(text: string): string[] {
    // Remove common stop words
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
      'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
      'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need',
      'that', 'this', 'these', 'those', 'it', 'its', "it's", 'they', 'them',
      'their', 'we', 'us', 'our', 'you', 'your', "you're", 'i', 'me', 'my',
      'he', 'she', 'him', 'her', 'his', 'who', 'what', 'where', 'when', 'why',
      'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other',
      'some', 'such', 'no', 'not', 'only', 'same', 'so', 'than', 'too', 'very',
      'just', 'also', 'now', 'here', 'there', 'then', 'once', 'any', 'about',
    ]);

    const words = text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 3 && !stopWords.has(w));

    // Return unique keywords
    return [...new Set(words)];
  }

  /**
   * Check if text contains keywords from a phrase
   */
  private textContainsKeywords(text: string, phrase: string): boolean {
    const keywords = phrase
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3);

    if (keywords.length === 0) return false;

    // At least 50% of keywords should be present
    const hits = keywords.filter((kw) => text.includes(kw)).length;
    return hits >= keywords.length * 0.5;
  }
}
