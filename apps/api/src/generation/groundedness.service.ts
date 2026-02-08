import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectFacts } from '@prisma/client';
import { StyleFilterService } from './style-filter.service';

/**
 * Types of groundedness violations
 */
export type ViolationType =
  | 'promo'      // Unauthorized promotional claims
  | 'proof'      // Unverified social proof/statistics
  | 'feature'    // Feature not in verified list
  | 'absolute'   // Absolute claims (best, only, guaranteed)
  | 'timeline'   // Unrealistic time promises
  | 'scale'      // Unverified scale claims (thousands, millions)
  | 'harsh';     // Harsh/insulting language

/**
 * A single groundedness violation
 */
export interface GroundednessViolation {
  type: ViolationType;
  text: string;               // The offending text
  suggestion?: string;        // How to fix it
}

/**
 * Result of groundedness validation
 */
export interface GroundednessResult {
  passed: boolean;
  score: number;              // 0-100 (100 = fully grounded)
  violations: GroundednessViolation[];
}

/**
 * Script content structure for validation
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
 * Generic suggestion templates per violation type.
 * Stored in code (not DB) since these are UX strings, not patterns.
 */
const VIOLATION_SUGGESTIONS: Record<string, string> = {
  absolute: 'Remove absolute claim or qualify with specifics',
  scale: 'Replace with specific number from allowedProof',
  promo: 'Remove unless listed in allowed promos',
  timeline: 'Replace with realistic timeframe',
  proof: 'Remove unless backed by allowedProof',
};

@Injectable()
export class GroundednessService {
  private readonly logger = new Logger(GroundednessService.name);

  constructor(
    private prisma: PrismaService,
    private styleFilter: StyleFilterService,
  ) {}

  /**
   * Validate a script against ProjectFacts for groundedness
   */
  async validateScript(
    script: ScriptContent,
    projectId: string,
    language = 'en',
  ): Promise<GroundednessResult> {
    // Get project facts
    const facts = await this.prisma.projectFacts.findUnique({
      where: { projectId },
    });

    return this.checkGroundedness(script, facts, language);
  }

  /**
   * Validate script with pre-loaded facts (for batch processing)
   */
  async checkGroundedness(
    script: ScriptContent,
    facts: ProjectFacts | null,
    language = 'en',
  ): Promise<GroundednessResult> {
    const violations: GroundednessViolation[] = [];
    const allText = this.extractText(script);

    // Load patterns from DB
    const policy = await this.styleFilter.getPolicy(language);

    // 1. Check absolute claims (always flagged)
    this.checkPatterns(
      allText, policy?.groundednessAbsolutePatterns ?? [], 'absolute', violations,
    );

    // 2. Check scale claims (always flagged unless in allowedProof)
    this.checkPatterns(
      allText, policy?.groundednessScalePatterns ?? [], 'scale', violations,
      { allowedProof: facts?.allowedProof || [] },
    );

    // 3. Check promo claims (flagged unless in promos list)
    this.checkPatterns(
      allText, policy?.groundednessPromoPatterns ?? [], 'promo', violations,
      { promos: facts?.promos || [] },
    );

    // 4. Check timeline claims (always flagged - unrealistic promises)
    this.checkPatterns(
      allText, policy?.groundednessTimelinePatterns ?? [], 'timeline', violations,
    );

    // 5. Check social proof claims (flagged unless in allowedProof)
    this.checkPatterns(
      allText, policy?.groundednessSocialProofPatterns ?? [], 'proof', violations,
      { allowedProof: facts?.allowedProof || [] },
    );

    // 6. Check harsh labels (if harshLabelsBan is set)
    if (facts?.harshLabelsBan?.length) {
      const textLower = allText.toLowerCase();
      for (const harshWord of facts.harshLabelsBan) {
        if (textLower.includes(harshWord.toLowerCase())) {
          violations.push({
            type: 'harsh',
            text: harshWord,
            suggestion: `Remove harsh language: "${harshWord}"`,
          });
        }
      }
    }

    // Calculate score (100 - penalty per violation)
    const penaltyPerViolation = 15;
    const score = Math.max(0, 100 - violations.length * penaltyPerViolation);

    return {
      passed: violations.length === 0,
      score,
      violations,
    };
  }

  /**
   * Check regex pattern strings against text for violations.
   * Optionally skip matches that are covered by allowedProof or promos.
   */
  private checkPatterns(
    text: string,
    patterns: string[],
    type: ViolationType,
    violations: GroundednessViolation[],
    context?: { allowedProof?: string[]; promos?: string[] },
  ): void {
    for (const patStr of patterns) {
      try {
        const regex = new RegExp(patStr, 'gi');
        const matches = text.match(regex);
        if (matches) {
          const matchText = matches[0];

          // Skip if covered by allowed proof or promos
          if (context?.allowedProof && this.isInAllowedProof(matchText, context.allowedProof)) {
            continue;
          }
          if (context?.promos && this.isInPromosList(matchText, context.promos)) {
            continue;
          }

          violations.push({
            type,
            text: matchText,
            suggestion: VIOLATION_SUGGESTIONS[type] || 'Review this claim',
          });
        }
      } catch {
        this.logger.warn(`Invalid groundedness regex: ${patStr}`);
      }
    }
  }

  /**
   * Check if a matched text is covered by allowed promos
   */
  private isInPromosList(matchText: string, promos: string[]): boolean {
    if (!promos.length) return false;

    const matchLower = matchText.toLowerCase();
    return promos.some(promo => {
      const promoLower = promo.toLowerCase();
      // Check if the promo contains the matched text or vice versa
      return promoLower.includes(matchLower) || matchLower.includes(promoLower);
    });
  }

  /**
   * Check if a matched text is covered by allowed proof
   */
  private isInAllowedProof(matchText: string, allowedProof: string[]): boolean {
    if (!allowedProof.length) return false;

    const matchLower = matchText.toLowerCase();
    return allowedProof.some(proof => {
      const proofLower = proof.toLowerCase();
      // Check if the proof contains the matched text or vice versa
      return proofLower.includes(matchLower) || matchLower.includes(proofLower);
    });
  }

  /**
   * Extract all text from a script
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
   * Batch validate multiple scripts
   */
  async validateScripts(
    scripts: ScriptContent[],
    projectId: string,
    language = 'en',
  ): Promise<GroundednessResult[]> {
    // Load facts once for all scripts
    const facts = await this.prisma.projectFacts.findUnique({
      where: { projectId },
    });

    return Promise.all(scripts.map(script => this.checkGroundedness(script, facts, language)));
  }

  /**
   * Get facts for a project (utility method)
   */
  async getProjectFacts(projectId: string): Promise<ProjectFacts | null> {
    return this.prisma.projectFacts.findUnique({
      where: { projectId },
    });
  }
}
