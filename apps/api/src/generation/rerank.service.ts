import { Injectable, Logger } from '@nestjs/common';
import { Persona, StylePolicy } from '@prisma/client';
import { CLICHE_PENALTIES } from './cliche-patterns';
import { StyleFilterService } from './style-filter.service';

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
 * Penalty for scripts that failed style filter (kept but ranked lower)
 */
const STYLE_FILTER_PENALTY = 25;

/**
 * Score breakdown for transparency/debugging
 */
export interface RerankScores {
  specificity: number;
  novelty: number;
  audienceFit: number;
  hookStrength: number;
  final: number;
  /** Diversity penalty applied (negative value subtracted from final) */
  diversityPenalty?: number;
  /** Style filter penalty for violations (script kept but ranked lower) */
  filterPenalty?: number;
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
  /** Filter violations from soft filter (script kept but penalized) */
  filterViolations?: string[];
}

/**
 * Product context for specificity scoring
 */
interface ProductContext {
  productDescription: string;
  productName?: string;
  language?: string;
  /** ProjectFacts for grounded specificity scoring */
  facts?: {
    features: string[];
    workflowSteps: string[];
    allowedProof: string[];
    promos: string[];
    pricing?: string | null;
  } | null;
}

/**
 * Fallback power words (used when no policy is loaded)
 */
const FALLBACK_HOOK_POWER_WORDS = [
  'stop', 'wait', 'secret', 'finally', 'never', 'always',
  'everyone', 'nobody', 'mistake', 'wrong', 'actually',
  'truth', 'real', 'honest',
];


@Injectable()
export class RerankService {
  private readonly logger = new Logger(RerankService.name);

  constructor(private styleFilter: StyleFilterService) {}

  /**
   * Rerank scripts by quality scores and return sorted list
   * Applies diversity penalties to avoid repetitive hook patterns
   */
  async rerankScripts<T extends ScriptContent>(
    scripts: T[],
    productContext: ProductContext,
    personas: Persona[],
  ): Promise<RankedScript<T>[]> {
    // Load policy once for all scoring
    const language = productContext.language || 'en';
    const policy = await this.styleFilter.getPolicy(language);

    // First pass: score all scripts individually
    const ranked = scripts.map((script) => {
      const scores = this.scoreScript(script, productContext, personas, policy);
      return { script, scores };
    });

    // Apply filter penalty to scripts with style violations
    // They're kept (users paid for them) but ranked lower
    this.applyFilterPenalties(ranked);

    // Sort by final score descending (initial ranking)
    ranked.sort((a, b) => b.scores.final - a.scores.final);

    // Second pass: apply diversity penalties to avoid repetitive hooks
    this.applyDiversityPenalties(ranked);

    // Re-sort after diversity penalties
    ranked.sort((a, b) => b.scores.final - a.scores.final);

    this.logger.log(
      `Reranked ${scripts.length} scripts. Top score: ${ranked[0]?.scores.final || 0}, Bottom: ${ranked[ranked.length - 1]?.scores.final || 0}`,
    );

    return ranked;
  }

  /**
   * Apply penalty to scripts that failed the style filter
   * Scripts are kept (users paid for them) but ranked lower
   */
  private applyFilterPenalties<T extends ScriptContent>(
    ranked: RankedScript<T>[],
  ): void {
    for (const item of ranked) {
      if (item.script.filterViolations && item.script.filterViolations.length > 0) {
        item.scores.filterPenalty = STYLE_FILTER_PENALTY;
        item.scores.final = Math.max(0, item.scores.final - STYLE_FILTER_PENALTY);

        this.logger.debug(
          `Filter penalty: -${STYLE_FILTER_PENALTY} for violations: ${item.script.filterViolations.join(', ')}`,
        );
      }
    }
  }

  /**
   * Apply diversity penalties to scripts with similar hook openers
   * Penalizes scripts that start with the same 3 words as higher-ranked scripts
   */
  private applyDiversityPenalties<T extends ScriptContent>(
    ranked: RankedScript<T>[],
  ): void {
    const seenOpeners = new Map<string, number>(); // opener -> count

    for (const item of ranked) {
      const hook = item.script.hook || '';
      const opener = this.getHookOpener(hook);

      if (opener) {
        const count = seenOpeners.get(opener) || 0;

        if (count > 0) {
          // Apply increasing penalty for repeated openers
          // First duplicate: -8, second: -16, etc.
          const penalty = count * 8;
          item.scores.diversityPenalty = penalty;
          item.scores.final = Math.max(0, item.scores.final - penalty);

          this.logger.debug(
            `Diversity penalty: -${penalty} for repeated opener "${opener}" (occurrence ${count + 1})`,
          );
        }

        seenOpeners.set(opener, count + 1);
      }
    }
  }

  /**
   * Extract normalized hook opener (first 3 significant words)
   */
  private getHookOpener(hook: string): string | null {
    if (!hook) return null;

    // Normalize: lowercase, remove punctuation
    const normalized = hook
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .trim();

    // Get first 3 words
    const words = normalized.split(/\s+/).slice(0, 3);
    if (words.length < 2) return null; // Need at least 2 words to compare

    return words.join(' ');
  }

  /**
   * Score a single script across all dimensions
   */
  scoreScript(
    script: ScriptContent,
    productContext: ProductContext,
    personas: Persona[],
    policy?: StylePolicy | null,
  ): RerankScores {
    const specificity = this.scoreSpecificity(script, productContext);
    const novelty = this.scoreNovelty(script, policy);
    const audienceFit = this.scoreAudienceFit(script, personas);
    const hookStrength = this.scoreHookStrength(script.hook, policy);

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
  scoreHookStrength(hook: string, policy?: StylePolicy | null): number {
    if (!hook) return 0;

    let score = 0;
    const hookLower = hook.toLowerCase();

    // 0. Penalize cliché hook starters (from DB)
    const hookOpeners = policy?.clicheHookOpeners ?? [];
    for (const cliche of hookOpeners) {
      if (hookLower.startsWith(cliche) || hookLower.includes(cliche)) {
        score += CLICHE_PENALTIES.hookOpener;
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
    const powerWords = policy?.hookPowerWords?.length
      ? policy.hookPowerWords
      : FALLBACK_HOOK_POWER_WORDS;
    let powerWordCount = 0;
    for (const word of powerWords) {
      if (hookLower.includes(word)) {
        powerWordCount++;
      }
    }
    score += Math.min(20, powerWordCount * 7);

    // 6. Emotional/curiosity trigger (0-15)
    const emotionalStrs = policy?.emotionalPatterns?.length
      ? policy.emotionalPatterns
      : [
          '\\b(tired|sick|frustrated|hate|love|obsessed|scared|stressed)\\b',
          '\\b(secret|hidden|truth|real|honest)\\b',
          '\\b(stop|wait|don\'t|never|always)\\b',
        ];
    for (const patStr of emotionalStrs) {
      try {
        const pattern = new RegExp(patStr, 'i');
        if (pattern.test(hook)) {
          score += 5;
        }
      } catch {
        // skip invalid regex
      }
    }

    return Math.min(100, score);
  }

  /**
   * Specificity: How much the script uses verified product facts
   * Uses ProjectFacts for grounded scoring, falls back to keywords if no facts
   */
  private scoreSpecificity(
    script: ScriptContent,
    productContext: ProductContext,
  ): number {
    const text = this.extractText(script).toLowerCase();
    const facts = productContext.facts;

    // If we have ProjectFacts, use grounded specificity scoring
    if (facts && this.hasGroundingFacts(facts)) {
      return this.scoreGroundedSpecificity(text, facts, productContext);
    }

    // Fallback: keyword-based scoring from product description
    return this.scoreKeywordSpecificity(text, productContext);
  }

  /**
   * Check if facts have meaningful grounding content
   */
  private hasGroundingFacts(facts: NonNullable<ProductContext['facts']>): boolean {
    return (
      facts.features.length > 0 ||
      facts.workflowSteps.length > 0 ||
      facts.allowedProof.length > 0 ||
      facts.promos.length > 0 ||
      !!facts.pricing
    );
  }

  /**
   * Score specificity based on verified ProjectFacts
   * Only rewards fact-backed details, not hallucinations
   */
  private scoreGroundedSpecificity(
    text: string,
    facts: NonNullable<ProductContext['facts']>,
    productContext: ProductContext,
  ): number {
    let score = 0;

    // Reward: mentions of verified features (+10 each, max 40)
    let featureMatches = 0;
    for (const feature of facts.features) {
      if (this.textContainsConcept(text, feature)) {
        featureMatches++;
      }
    }
    score += Math.min(40, featureMatches * 10);

    // Reward: correct workflow references (+8 each, max 24)
    let workflowMatches = 0;
    for (const step of facts.workflowSteps) {
      if (this.textContainsConcept(text, step)) {
        workflowMatches++;
      }
    }
    score += Math.min(24, workflowMatches * 8);

    // Reward: allowed proof usage (+12 each, max 24)
    let proofMatches = 0;
    for (const proof of facts.allowedProof) {
      if (this.textContainsConcept(text, proof)) {
        proofMatches++;
      }
    }
    score += Math.min(24, proofMatches * 12);

    // Reward: allowed promo usage (+8 each, max 16)
    let promoMatches = 0;
    for (const promo of facts.promos) {
      if (this.textContainsConcept(text, promo)) {
        promoMatches++;
      }
    }
    score += Math.min(16, promoMatches * 8);

    // Reward: pricing mention (+10)
    if (facts.pricing && this.textContainsConcept(text, facts.pricing)) {
      score += 10;
    }

    // Bonus for product name mention (+10)
    if (productContext.productName) {
      const productNameLower = productContext.productName.toLowerCase();
      if (text.includes(productNameLower)) {
        score += 10;
      }
    }

    // If no facts matched at all, give a base score
    if (score === 0) {
      score = 30; // Base score for having facts but no matches
    }

    return Math.min(100, score);
  }

  /**
   * Fallback: score specificity based on product description keywords
   */
  private scoreKeywordSpecificity(
    text: string,
    productContext: ProductContext,
  ): number {
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
    const productNumbers =
      productDesc.match(
        /\d+(?:\.\d+)?(?:\s*[%xX]|\s*(?:minutes?|seconds?|hours?|days?))?/g,
      ) || [];
    const scriptNumbers =
      text.match(
        /\d+(?:\.\d+)?(?:\s*[%xX]|\s*(?:minutes?|seconds?|hours?|days?))?/g,
      ) || [];

    for (const num of scriptNumbers) {
      if (productNumbers.some((pn) => pn.includes(num) || num.includes(pn))) {
        score += 10;
        break;
      }
    }

    return Math.min(100, score);
  }

  /**
   * Check if text contains a concept (fuzzy match on key words)
   * Extracts significant words from the concept and checks if they appear
   */
  private textContainsConcept(text: string, concept: string): boolean {
    const conceptLower = concept.toLowerCase();

    // Direct inclusion check first
    if (text.includes(conceptLower)) {
      return true;
    }

    // Extract key words from concept (3+ chars, not stopwords)
    const conceptKeywords = this.extractKeywords(conceptLower);
    if (conceptKeywords.length === 0) return false;

    // Check if majority of keywords appear
    let matches = 0;
    for (const kw of conceptKeywords) {
      if (text.includes(kw)) {
        matches++;
      }
    }

    // Require at least half of keywords to match
    return matches >= Math.ceil(conceptKeywords.length / 2);
  }

  /**
   * Novelty: How non-generic and fresh the script sounds
   */
  private scoreNovelty(script: ScriptContent, policy?: StylePolicy | null): number {
    const text = this.extractText(script);
    const textLower = text.toLowerCase();
    let score = 100;

    // Deduct for generic filler phrases (from DB)
    const genericFiller = policy?.clicheGenericFiller ?? [];
    for (const phrase of genericFiller) {
      if (textLower.includes(phrase)) {
        score += CLICHE_PENALTIES.genericFiller;
      }
    }

    // Deduct for LLM-smell phrases (from DB)
    const llmSmell = policy?.clicheLlmSmell ?? [];
    for (const phrase of llmSmell) {
      if (textLower.includes(phrase)) {
        score += CLICHE_PENALTIES.llmSmell;
      }
    }

    // Deduct for structural patterns (from DB — regex strings)
    const structurePatterns = policy?.clicheStructurePatterns ?? [];
    for (const patStr of structurePatterns) {
      try {
        const pattern = new RegExp(patStr, 'gi');
        if (pattern.test(text)) {
          score += CLICHE_PENALTIES.structure;
        }
      } catch {
        // skip invalid regex
      }
    }

    // Deduct for excessive word usage (from wordLimits with scorePenalty)
    const wordLimits = (policy?.wordLimits ?? {}) as Record<string, { max?: number; scorePenalty?: number }>;
    for (const [word, config] of Object.entries(wordLimits)) {
      if (!config.scorePenalty) continue;
      let regex: RegExp;
      if (word === '!') {
        regex = /!/g;
      } else if (word === '?') {
        regex = /\?/g;
      } else {
        regex = new RegExp(`\\b${word}\\b`, 'gi');
      }
      const count = (text.match(regex) || []).length;
      const max = config.max ?? 0;
      if (count > max) {
        score += (count - max) * config.scorePenalty;
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

    return Math.max(0, score);
  }

  /**
   * Audience Fit: How well the script addresses persona pain points and desires
   * Uses fuzzy matching and includes persona name/description matching
   */
  private scoreAudienceFit(script: ScriptContent, personas: Persona[]): number {
    if (!personas || personas.length === 0) return 50; // Default if no personas

    const text = this.extractText(script).toLowerCase();
    let score = 0;

    // Collect all pain points, desires, and context from personas
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

    // NEW: Score persona name/description relevance (0-20 bonus)
    let personaContextBonus = 0;
    for (const persona of personas) {
      // Check if persona name keywords appear in script
      const nameKeywords = this.extractKeywordsWithStemming(persona.name);
      for (const kw of nameKeywords) {
        if (text.includes(kw)) {
          personaContextBonus += 5;
          break;
        }
      }

      // Check if description keywords appear
      if (persona.description) {
        const descKeywords = this.extractKeywordsWithStemming(persona.description).slice(0, 10);
        let descHits = 0;
        for (const kw of descKeywords) {
          if (text.includes(kw) || this.stemContains(text, kw)) {
            descHits++;
          }
        }
        if (descHits >= 2) {
          personaContextBonus += 5;
        }
      }
    }
    score += Math.min(20, personaContextBonus);

    // Score pain point mentions (0-40)
    let painHits = 0;
    for (const pain of painPoints) {
      if (this.textContainsKeywordsFuzzy(text, pain)) {
        painHits++;
      }
    }
    const painTarget = Math.min(painPoints.length, 5);
    if (painTarget > 0) {
      score += Math.min(40, Math.round((painHits / painTarget) * 40));
    } else {
      score += 20; // Default if no pain points defined
    }

    // Score desire mentions (0-40)
    let desireHits = 0;
    for (const desire of desires) {
      if (this.textContainsKeywordsFuzzy(text, desire)) {
        desireHits++;
      }
    }
    const desireTarget = Math.min(desires.length, 5);
    if (desireTarget > 0) {
      score += Math.min(40, Math.round((desireHits / desireTarget) * 40));
    } else {
      score += 20; // Default if no desires defined
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
   * Check if text contains keywords from a phrase (legacy exact match)
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

  /**
   * Check if text contains keywords from a phrase with fuzzy/stem matching
   * More lenient than textContainsKeywords - uses 40% threshold and stem matching
   */
  private textContainsKeywordsFuzzy(text: string, phrase: string): boolean {
    const keywords = this.extractKeywordsWithStemming(phrase);
    if (keywords.length === 0) return false;

    // Count matches using stem matching
    let hits = 0;
    for (const kw of keywords) {
      if (text.includes(kw) || this.stemContains(text, kw)) {
        hits++;
      }
    }

    // At least 40% of keywords should be present (more lenient than 50%)
    return hits >= keywords.length * 0.4;
  }

  /**
   * Extract keywords with basic stemming applied
   */
  private extractKeywordsWithStemming(text: string): string[] {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
      'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
      'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need',
      'that', 'this', 'these', 'those', 'it', 'its', 'they', 'them',
      'their', 'we', 'us', 'our', 'you', 'your', 'i', 'me', 'my',
    ]);

    const words = text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !stopWords.has(w)) // Lower threshold to 2 chars
      .map((w) => this.simpleStem(w));

    return [...new Set(words)];
  }

  /**
   * Simple stemming: remove common suffixes
   * This is a lightweight approach that handles common cases
   */
  private simpleStem(word: string): string {
    // Handle common suffixes
    if (word.endsWith('ing') && word.length > 5) {
      return word.slice(0, -3);
    }
    if (word.endsWith('ed') && word.length > 4) {
      return word.slice(0, -2);
    }
    if (word.endsWith('er') && word.length > 4) {
      return word.slice(0, -2);
    }
    if (word.endsWith('est') && word.length > 5) {
      return word.slice(0, -3);
    }
    if (word.endsWith('ness') && word.length > 6) {
      return word.slice(0, -4);
    }
    if (word.endsWith('ment') && word.length > 6) {
      return word.slice(0, -4);
    }
    if (word.endsWith('ly') && word.length > 4) {
      return word.slice(0, -2);
    }
    if (word.endsWith('ies') && word.length > 4) {
      return word.slice(0, -3) + 'y';
    }
    if (word.endsWith('es') && word.length > 4) {
      return word.slice(0, -2);
    }
    if (word.endsWith('s') && word.length > 3 && !word.endsWith('ss')) {
      return word.slice(0, -1);
    }
    return word;
  }

  /**
   * Check if text contains a stemmed version of keyword
   * Checks if keyword stem appears as prefix of any word in text
   */
  private stemContains(text: string, keyword: string): boolean {
    const stem = this.simpleStem(keyword);
    // Check if any word in text starts with the stem (handles gaming/gamer/games)
    const textWords = text.split(/\s+/);
    return textWords.some((w) => {
      const wordStem = this.simpleStem(w);
      // Match if stems are equal or one is prefix of the other (min 4 chars)
      return wordStem === stem ||
        (stem.length >= 4 && wordStem.startsWith(stem)) ||
        (wordStem.length >= 4 && stem.startsWith(wordStem));
    });
  }
}
