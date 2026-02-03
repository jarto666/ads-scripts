import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectFacts } from '@prisma/client';

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
 * Patterns for detecting violations
 */
const ABSOLUTE_CLAIMS_PATTERNS = [
  { pattern: /\bonly\b/gi, suggestion: 'Remove "only" or replace with "a great"' },
  { pattern: /\bbest\b/gi, suggestion: 'Remove "best" or be specific about why' },
  { pattern: /\bultimate\b/gi, suggestion: 'Remove "ultimate" - too hyperbolic' },
  { pattern: /\bguaranteed?\b/gi, suggestion: 'Remove guarantee claims unless legally verified' },
  { pattern: /\b#1\b|number one/gi, suggestion: 'Remove "#1" claim unless verifiable' },
  { pattern: /\bperfect\b/gi, suggestion: 'Remove "perfect" - too absolute' },
  { pattern: /\bunmatched\b/gi, suggestion: 'Remove "unmatched" - unverifiable claim' },
  { pattern: /\bunbeatable\b/gi, suggestion: 'Remove "unbeatable" - unverifiable claim' },
];

const SCALE_CLAIMS_PATTERNS = [
  { pattern: /\bthousands\b/gi, suggestion: 'Replace with specific number from allowedProof, or remove' },
  { pattern: /\bmillions\b/gi, suggestion: 'Replace with specific number from allowedProof, or remove' },
  { pattern: /\beveryone\b/gi, suggestion: 'Replace with specific audience segment' },
  { pattern: /\beverybody\b/gi, suggestion: 'Replace with specific audience segment' },
  { pattern: /\bcountless\b/gi, suggestion: 'Replace with specific number or remove' },
  { pattern: /\bhundreds of thousands\b/gi, suggestion: 'Replace with specific number from allowedProof' },
];

const PROMO_PATTERNS = [
  { pattern: /\bfree trial\b/gi, suggestion: 'Remove unless in promos list' },
  { pattern: /\bno credit card\b/gi, suggestion: 'Remove unless in promos list' },
  { pattern: /\d+%\s*off\b/gi, suggestion: 'Remove unless in promos list' },
  { pattern: /\bpromo code\b/gi, suggestion: 'Remove unless in promos list' },
  { pattern: /\bdiscount\b/gi, suggestion: 'Remove unless in promos list' },
  { pattern: /\bfirst \d+ free\b/gi, suggestion: 'Remove unless in promos list' },
  { pattern: /\blimited time\b/gi, suggestion: 'Remove unless in promos list' },
  { pattern: /\bspecial offer\b/gi, suggestion: 'Remove unless in promos list' },
  { pattern: /\bexclusive deal\b/gi, suggestion: 'Remove unless in promos list' },
  { pattern: /\bmoney[- ]back guarantee\b/gi, suggestion: 'Remove unless in promos list' },
];

const TIMELINE_PATTERNS = [
  { pattern: /\bin (?:just )?\d+ seconds?\b/gi, suggestion: 'Replace with realistic timeframe or remove' },
  { pattern: /\binstantly\b/gi, suggestion: 'Replace with "quickly" or specific timeframe' },
  { pattern: /\bovernight\b/gi, suggestion: 'Be realistic about timeline' },
  { pattern: /\bimmediately\b/gi, suggestion: 'Replace with realistic timeframe' },
  { pattern: /\bin minutes\b/gi, suggestion: 'Specify actual time if verified' },
];

const SOCIAL_PROOF_PATTERNS = [
  { pattern: /\b5[- ]star\b/gi, suggestion: 'Remove unless in allowedProof' },
  { pattern: /\b4\.[5-9][- ]star\b/gi, suggestion: 'Remove unless in allowedProof' },
  { pattern: /\breviews?\b/gi, suggestion: 'Only mention if specific reviews in allowedProof' },
  { pattern: /\btestimonials?\b/gi, suggestion: 'Only mention if specific testimonials in allowedProof' },
  { pattern: /\b\d+[kKmM]?\+?\s*(?:users?|customers?|people)\b/gi, suggestion: 'Only use if in allowedProof' },
  { pattern: /\btrusted by\b/gi, suggestion: 'Remove unless specific proof in allowedProof' },
  { pattern: /\brated\s+#?\d\b/gi, suggestion: 'Remove unless in allowedProof' },
  { pattern: /\baward[- ]winning\b/gi, suggestion: 'Remove unless specific award in allowedProof' },
];

@Injectable()
export class GroundednessService {
  private readonly logger = new Logger(GroundednessService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Validate a script against ProjectFacts for groundedness
   */
  async validateScript(
    script: ScriptContent,
    projectId: string,
  ): Promise<GroundednessResult> {
    // Get project facts
    const facts = await this.prisma.projectFacts.findUnique({
      where: { projectId },
    });

    // If no facts exist, we can only check for absolute claims
    return this.checkGroundedness(script, facts);
  }

  /**
   * Validate script with pre-loaded facts (for batch processing)
   */
  checkGroundedness(
    script: ScriptContent,
    facts: ProjectFacts | null,
  ): GroundednessResult {
    const violations: GroundednessViolation[] = [];
    const allText = this.extractText(script);

    // 1. Check absolute claims (always flagged)
    for (const { pattern, suggestion } of ABSOLUTE_CLAIMS_PATTERNS) {
      const matches = allText.match(pattern);
      if (matches) {
        violations.push({
          type: 'absolute',
          text: matches[0],
          suggestion,
        });
      }
    }

    // 2. Check scale claims (always flagged unless in allowedProof)
    for (const { pattern, suggestion } of SCALE_CLAIMS_PATTERNS) {
      const matches = allText.match(pattern);
      if (matches) {
        const matchText = matches[0];
        if (!this.isInAllowedProof(matchText, facts?.allowedProof || [])) {
          violations.push({
            type: 'scale',
            text: matchText,
            suggestion,
          });
        }
      }
    }

    // 3. Check promo claims (flagged unless in promos list)
    for (const { pattern, suggestion } of PROMO_PATTERNS) {
      const matches = allText.match(pattern);
      if (matches) {
        const matchText = matches[0];
        if (!this.isInPromosList(matchText, facts?.promos || [])) {
          violations.push({
            type: 'promo',
            text: matchText,
            suggestion,
          });
        }
      }
    }

    // 4. Check timeline claims (always flagged - unrealistic promises)
    for (const { pattern, suggestion } of TIMELINE_PATTERNS) {
      const matches = allText.match(pattern);
      if (matches) {
        violations.push({
          type: 'timeline',
          text: matches[0],
          suggestion,
        });
      }
    }

    // 5. Check social proof claims (flagged unless in allowedProof)
    for (const { pattern, suggestion } of SOCIAL_PROOF_PATTERNS) {
      const matches = allText.match(pattern);
      if (matches) {
        const matchText = matches[0];
        if (!this.isInAllowedProof(matchText, facts?.allowedProof || [])) {
          violations.push({
            type: 'proof',
            text: matchText,
            suggestion,
          });
        }
      }
    }

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
    // Each violation reduces score by 15 points
    const penaltyPerViolation = 15;
    const score = Math.max(0, 100 - violations.length * penaltyPerViolation);

    return {
      passed: violations.length === 0,
      score,
      violations,
    };
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
  ): Promise<GroundednessResult[]> {
    // Load facts once for all scripts
    const facts = await this.prisma.projectFacts.findUnique({
      where: { projectId },
    });

    return scripts.map(script => this.checkGroundedness(script, facts));
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
