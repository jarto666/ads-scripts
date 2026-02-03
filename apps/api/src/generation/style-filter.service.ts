import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StylePolicy } from '@prisma/client';

/**
 * Word limit configuration from StylePolicy.wordLimits JSON
 */
interface WordLimit {
  max: number;
  enforce: boolean;
}

interface WordLimits {
  [key: string]: WordLimit;
}

/**
 * Result of filtering a script
 */
export interface FilterResult {
  passed: boolean;
  violations: string[];
  warnings: string[];
}

/**
 * Script content to filter
 */
interface ScriptContent {
  hook: string;
  storyboard: Array<{
    spoken?: string;
    onScreen?: string;
  }>;
  ctaVariants: string[];
}

@Injectable()
export class StyleFilterService {
  private readonly logger = new Logger(StyleFilterService.name);
  private policyCache: Map<string, { policy: StylePolicy; cachedAt: number }> = new Map();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  constructor(private prisma: PrismaService) {}

  /**
   * Get StylePolicy for a language (with caching)
   */
  async getPolicy(language: string, scope = 'global'): Promise<StylePolicy | null> {
    const cacheKey = `${language}:${scope}`;
    const cached = this.policyCache.get(cacheKey);

    if (cached && Date.now() - cached.cachedAt < this.CACHE_TTL_MS) {
      return cached.policy;
    }

    const policy = await this.prisma.stylePolicy.findUnique({
      where: {
        language_scope: { language, scope },
      },
    });

    if (policy) {
      this.policyCache.set(cacheKey, { policy, cachedAt: Date.now() });
    }

    return policy;
  }

  /**
   * Filter a script against StylePolicy rules
   */
  async filterScript(
    script: ScriptContent,
    language: string,
    scope = 'global',
  ): Promise<FilterResult> {
    const policy = await this.getPolicy(language, scope);

    if (!policy) {
      // No policy = no filtering (pass everything)
      this.logger.warn(`No StylePolicy found for ${language}:${scope}, skipping filter`);
      return { passed: true, violations: [], warnings: [] };
    }

    return this.applyPolicy(script, policy);
  }

  /**
   * Apply policy rules to script content
   */
  private applyPolicy(script: ScriptContent, policy: StylePolicy): FilterResult {
    const violations: string[] = [];
    const warnings: string[] = [];

    // Extract all text from script
    const allText = this.extractText(script);
    const textLower = allText.toLowerCase();

    // 1. Check word limits
    const wordLimits = policy.wordLimits as unknown as WordLimits;
    for (const [word, config] of Object.entries(wordLimits)) {
      const count = this.countWord(allText, word);
      if (count > config.max) {
        const message = `Word limit exceeded: "${word}" appears ${count} times (max: ${config.max})`;
        if (config.enforce) {
          violations.push(message);
        } else {
          warnings.push(message);
        }
      }
    }

    // 2. Check banned phrases (exact match)
    for (const phrase of policy.bannedPhrases) {
      if (textLower.includes(phrase.toLowerCase())) {
        violations.push(`Banned phrase: "${phrase}"`);
      }
    }

    // 3. Check banned regex patterns
    for (const pattern of policy.bannedRegex) {
      try {
        const regex = new RegExp(pattern, 'gi');
        const matches = allText.match(regex);
        if (matches && matches.length > 0) {
          violations.push(`Banned pattern: "${matches[0]}" (matched: ${pattern.slice(0, 30)}...)`);
        }
      } catch (e) {
        this.logger.error(`Invalid regex pattern: ${pattern}`, e);
      }
    }

    // 4. Check harsh words
    for (const word of policy.harshWords) {
      if (textLower.includes(word.toLowerCase())) {
        violations.push(`Harsh word: "${word}"`);
      }
    }

    // 5. Check soft avoid patterns (warnings only)
    for (const pattern of policy.softAvoid) {
      if (this.matchesSoftPattern(allText, pattern)) {
        warnings.push(`Soft avoid: ${pattern}`);
      }
    }

    return {
      passed: violations.length === 0,
      violations,
      warnings,
    };
  }

  /**
   * Extract all text content from a script
   */
  private extractText(script: ScriptContent): string {
    const parts: string[] = [
      script.hook || '',
      ...(script.storyboard || []).map(s => `${s.spoken || ''} ${s.onScreen || ''}`),
      ...(script.ctaVariants || []),
    ];
    return parts.join(' ');
  }

  /**
   * Count occurrences of a word or special pattern
   */
  private countWord(text: string, word: string): number {
    switch (word) {
      case 'exclamations':
        return (text.match(/!/g) || []).length;
      case 'ellipsis':
        return (text.match(/\.{3}/g) || []).length;
      case 'caps_words':
        return (text.match(/\b[A-Z]{2,}\b/g) || []).length;
      default:
        // Regular word count (case insensitive, word boundary)
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        return (text.match(regex) || []).length;
    }
  }

  /**
   * Check if text matches a soft avoid pattern description
   */
  private matchesSoftPattern(text: string, patternDescription: string): boolean {
    const textLower = text.toLowerCase();

    // Map pattern descriptions to actual checks
    if (patternDescription.includes('starting sentences with "So..."')) {
      return /(?:^|\.\s+)so\s/i.test(text);
    }
    if (patternDescription.includes('excessive rhetorical questions')) {
      return (text.match(/\?/g) || []).length > 3;
    }
    if (patternDescription.includes('"you guys" or "y\'all"')) {
      const count = (textLower.match(/\byou guys\b|\by'all\b|\byall\b/g) || []).length;
      return count > 1;
    }
    if (patternDescription.includes('"Right?" at end')) {
      return /right\?\s*$/i.test(text) || /right\?\s*["\)]/i.test(text);
    }
    if (patternDescription.includes('"Okay so" as opener')) {
      return /^okay so\b/i.test(text.trim()) || /^ok so\b/i.test(text.trim());
    }

    return false;
  }

  /**
   * Batch filter multiple scripts
   */
  async filterScripts(
    scripts: ScriptContent[],
    language: string,
    scope = 'global',
  ): Promise<FilterResult[]> {
    const policy = await this.getPolicy(language, scope);

    if (!policy) {
      return scripts.map(() => ({ passed: true, violations: [], warnings: [] }));
    }

    return scripts.map(script => this.applyPolicy(script, policy));
  }

  /**
   * Clear the policy cache (useful for testing or after policy updates)
   */
  clearCache(): void {
    this.policyCache.clear();
  }
}
