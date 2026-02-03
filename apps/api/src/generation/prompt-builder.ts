import { Project, Persona, ProjectFacts } from '@prisma/client';
import {
  getPlatformPromptBlock,
  getBeatCountGuidance,
  getBeatRange,
} from './platform-profiles';
import { getLanguageInstruction } from './language-utils';
import { SCRIPT_ANGLES, getAngleConfig } from './angles.config';

interface ScriptPlan {
  angle: string;
  duration: number;
  hookIdea: string;
  beats: string[];
  complianceNotes: string[];
}

/**
 * Build the grounding facts block for prompts.
 * This is the core mechanism to prevent hallucinations.
 */
function buildFactsBlock(facts: ProjectFacts | null, forbiddenClaims: string[]): string {
  if (!facts) {
    // Even without facts, include basic grounding rules
    return `## GROUNDING RULES (CRITICAL)
- Do NOT invent promotional offers, discounts, trials, or guarantees
- Do NOT invent statistics, user counts, ratings, or reviews
- Do NOT make absolute claims (best, only, ultimate, guaranteed)
- Do NOT invent features or capabilities not mentioned in the product description
${forbiddenClaims.length ? `\n### Forbidden Claims (DO NOT USE)\n${forbiddenClaims.map((c) => `- "${c}"`).join('\n')}` : ''}`;
  }

  const sections: string[] = [
    '## GROUNDING FACTS (CRITICAL)',
    'You must ONLY use these verified facts. Do NOT invent details.',
  ];

  // Product features
  if (facts.features.length > 0) {
    sections.push('\n### Verified Product Features');
    sections.push(facts.features.map((f) => `- ${f}`).join('\n'));
  }

  // Workflow steps (correct order)
  if (facts.workflowSteps.length > 0) {
    sections.push('\n### Workflow Steps (CORRECT ORDER - do not rearrange)');
    sections.push(facts.workflowSteps.map((s, i) => `${i + 1}. ${s}`).join('\n'));
  }

  // Pricing
  if (facts.pricing) {
    sections.push(`\n### Pricing: ${facts.pricing}`);
  }

  // Allowed promos
  sections.push('\n### Allowed Offers/Promos');
  if (facts.promos.length > 0) {
    sections.push(facts.promos.map((p) => `- ${p}`).join('\n'));
  } else {
    sections.push('NONE - do NOT mention any promotions, discounts, or special offers');
  }

  // Allowed CTAs
  if (facts.ctaRules.length > 0) {
    sections.push('\n### Allowed CTAs');
    sections.push(facts.ctaRules.map((c) => `- ${c}`).join('\n'));
  }

  // Allowed proof/stats
  sections.push('\n### Allowed Proof/Stats');
  if (facts.allowedProof.length > 0) {
    sections.push(facts.allowedProof.map((p) => `- ${p}`).join('\n'));
  } else {
    sections.push('NONE - do NOT claim statistics, user counts, ratings, or reviews');
  }

  // Forbidden claims
  if (forbiddenClaims.length > 0) {
    sections.push('\n### Forbidden Claims (NEVER use)');
    sections.push(forbiddenClaims.map((c) => `- "${c}"`).join('\n'));
  }

  // Harsh labels ban
  if (facts.harshLabelsBan.length > 0) {
    sections.push('\n### Banned Harsh Language');
    sections.push(facts.harshLabelsBan.map((w) => `- "${w}"`).join('\n'));
  }

  // Rules
  sections.push(`
### GROUNDING RULES
- If a fact is NOT listed above, do NOT include it
- Do NOT invent promos, discounts, trials, or guarantees
- Do NOT invent statistics, user counts, or reviews
- Do NOT mention features not in the verified features list
- Do NOT rearrange workflow steps - the order is verified
- Do NOT use harsh language from the banned list`);

  return sections.join('\n');
}

/**
 * Simplified facts block for hooks - focuses on what NOT to include.
 * Hooks are short so they need minimal grounding info.
 */
function buildFactsBlockForHooks(facts: ProjectFacts | null, forbiddenClaims: string[]): string {
  const sections: string[] = ['## GROUNDING (CRITICAL - Hooks must be truthful)'];

  // Allowed proof (hooks can mention these)
  if (facts?.allowedProof?.length) {
    sections.push('### You CAN mention:');
    sections.push(facts.allowedProof.map((p) => `- ${p}`).join('\n'));
  }

  // What to avoid
  sections.push('\n### Do NOT include in hooks:');
  sections.push('- Made-up statistics or user counts');
  sections.push('- Promotional claims (discounts, trials) unless verified');
  sections.push('- Absolute claims (best, only, ultimate, guaranteed)');

  if (forbiddenClaims.length > 0) {
    sections.push(`- Forbidden: ${forbiddenClaims.slice(0, 5).join(', ')}`);
  }

  if (facts?.harshLabelsBan?.length) {
    sections.push(`- Harsh language: ${facts.harshLabelsBan.slice(0, 5).join(', ')}`);
  }

  return sections.join('\n');
}

export function buildPass1Prompt(
  project: Project & { personas: Persona[] },
  settings: {
    platform: string;
    angles: string[];
    durations: number[];
    count: number;
  },
  facts?: ProjectFacts | null,
): string {
  const personaDescriptions = project.personas
    .map(
      (p) =>
        `- ${p.name}: ${p.description}${p.painPoints.length ? ` Pain points: ${p.painPoints.join(', ')}` : ''}${p.desires.length ? ` Desires: ${p.desires.join(', ')}` : ''}`,
    )
    .join('\n');

  const platformBlock = getPlatformPromptBlock(settings.platform);

  // Generate beat guidance for each duration
  const beatGuidance = settings.durations
    .map((d) => {
      const range = getBeatRange(d);
      return `- ${d}s: ${range.min}-${range.max} beats`;
    })
    .join('\n');

  const languageBlock = getLanguageInstruction(project.language, project.region);

  return `You are an expert UGC video ad script planner specializing in short-form vertical content.

${platformBlock}

## Product
${project.productDescription}

${languageBlock}## Target Audiences
${personaDescriptions || 'General audience'}

${project.brandVoice ? `## Brand Voice\n${project.brandVoice}\n` : ''}
${buildFactsBlock(facts || null, project.forbiddenClaims)}

## Beat Count Guidelines
${beatGuidance}

## Task
Generate ${settings.count} unique script PLANS for PAID ADS covering these angles: ${settings.angles.join(', ')}
Each plan should have a duration from: ${settings.durations.join('s, ')}s

For each plan, provide:
1. angle: One of the specified angles
2. duration: Target duration in seconds
3. hookIdea: A compelling hook idea matching the platform style (must grab attention in first 2 seconds)
4. beats: Bullet points outlining the script structure (follow beat count guidelines above)
5. complianceNotes: Any potential compliance risks or notes

IMPORTANT GUIDELINES:
- Match the platform's native advertising style (pacing, tone, hook style)
- Avoid absolute claims, guarantees, or exaggerated promises
- Distribute plans across angles and durations evenly
- Each beat should represent a distinct visual moment/cut

Return your response as a JSON array:
[
  {
    "angle": "pain_agitation",
    "duration": 30,
    "hookIdea": "Stop scrolling if you're tired of...",
    "beats": ["Hook with pain point", "Show the struggle", "Introduce solution"],
    "complianceNotes": ["Avoid medical claims"]
  }
]

OUTPUT CONTRACT (must follow exactly):
- Output must be valid JSON.
- Output must start with '[' and end with ']'.
- Do NOT wrap in markdown fences.
- Do NOT include any explanation, comments, or extra text.
- Do NOT include trailing commas.
If you include any characters before the first '[' or after the final ']', the output will be rejected.`;
}

export function buildPass2Prompt(
  project: Project & { personas: Persona[] },
  plan: ScriptPlan,
  platform: string,
  facts?: ProjectFacts | null,
): string {
  const personaContext = project.personas
    .map((p) => {
      const parts = [`${p.name}: ${p.description}`];
      if (p.demographics) parts.push(`Demographics: ${p.demographics}`);
      if (p.painPoints.length) parts.push(`Pain points: ${p.painPoints.slice(0, 3).join(', ')}`);
      return parts.join('. ');
    })
    .join('\n- ');

  const platformBlock = getPlatformPromptBlock(platform);
  const beatRange = getBeatRange(plan.duration);
  const languageBlock = getLanguageInstruction(project.language, project.region);

  // Get angle-specific guidance for script structure and visuals
  const angleConfig = getAngleConfig(plan.angle);
  const angleGuidanceBlock = angleConfig
    ? `## Angle: ${angleConfig.label}
${angleConfig.scriptStructureGuidance}
${angleConfig.visualDirection ? `\n### Visual Direction\n${angleConfig.visualDirection}` : ''}
`
    : `## Angle: ${plan.angle}
`;

  return `You are an expert UGC video ad script writer specializing in short-form vertical content.

${platformBlock}

## Product
${project.productDescription}

${languageBlock}## Target Audience
- ${personaContext || 'General audience'}

## PERSONA VOICE MATCHING
- Use vocabulary this person would actually use
- Reference their specific pain points naturally
- Match their energy level and communication style
- If targeting professionals: industry jargon is OK
- If targeting casual users: keep it simple and relatable

## CONVERSATIONAL DELIVERY (CRITICAL)
This is UGC - it must sound like a real person talking, not a script.
- Write spoken lines as ACTUAL speech, with contractions and natural rhythm
- Include verbal fillers where natural: "like", "honestly", "so basically"
- Avoid robotic phrasing: "It features...", "This product offers...", "Experience the..."
- Each line should pass the "would someone actually say this?" test

${project.brandVoice ? `## Brand Voice\n${project.brandVoice}\n` : ''}
${buildFactsBlock(facts || null, project.forbiddenClaims)}

${angleGuidanceBlock}
## Script Plan to Expand
Duration: ${plan.duration}s
Hook Idea: ${plan.hookIdea}
Beats: ${plan.beats.join(' → ')}
Compliance Notes: ${plan.complianceNotes.join(', ') || 'None'}

## Task
Write a complete PAID AD script following this EXACT JSON structure:

{
  "angle": "${plan.angle}",
  "duration": ${plan.duration},
  "hook": "The opening hook line",
  "storyboard": [
    {
      "t": "0-3s",
      "shot": "What is in frame and the action",
      "onScreen": "Text overlay for this segment",
      "spoken": "Exact words the creator says",
      "broll": ["B-roll idea 1", "B-roll idea 2"]
    }
  ],
  "ctaVariants": ["CTA option 1", "CTA option 2", "CTA option 3"],
  "filmingChecklist": ["Filming instruction 1", "Props needed", "Lighting note"],
  "warnings": ["Any compliance warnings"]
}

Note: storyboard array should have ${beatRange.min}-${beatRange.max} segments for ${plan.duration}s duration.

REQUIREMENTS:
- CRITICAL: Follow the angle structure guidance above. The script narrative must match the angle's framework throughout, not just in the hook.
- CRITICAL: Spoken lines must sound like natural speech (see CONVERSATIONAL DELIVERY above)
- The hook MUST grab attention in the first 2 seconds, matching the platform's hook style
- Storyboard should have ${beatRange.min}-${beatRange.max} segments for this ${plan.duration}s duration
- Each spoken line should match the platform's tone (see Platform section above)
- onScreen captions should match the platform's caption density expectations
- CTAs should match the platform's CTA style (not generic)
- Include specific, actionable filming instructions matching platform edit notes
- If any forbidden phrases appear, add a warning
- Time segments should add up to ~${plan.duration}s

VISUAL CREATIVITY:
Storyboard shots must be SPECIFIC and CREATIVE, not generic:
- BAD: "Creator holding product, nodding at camera"
- GOOD: "Extreme close-up: product drops into frame with satisfying thud, fingers trace the texture"
- BAD: "Fast cuts of using the product"
- GOOD: "Match-cut: finger swipe on phone → same motion reveals result on screen"
Include at least ONE of: visual metaphor, unexpected camera angle (POV, overhead, macro), or creative transition

OUTPUT CONTRACT (must follow exactly):
- Output must be valid JSON.
- Output must start with '{' and end with '}'.
- Do NOT wrap in markdown fences.
- Do NOT include any explanation, comments, or extra text.
- Do NOT include trailing commas.
If you include any characters before the first '{' or after the final '}', the output will be rejected.`;
}

/**
 * Build prompt for hook overgeneration (Phase 2 pipeline)
 * Generates multiple hook ideas per angle to filter and select from.
 * Uses angle-specific guidance for better hook variety and quality.
 */
export function buildHookGenerationPrompt(
  project: Project & { personas: Persona[] },
  settings: {
    platform: string;
    angles: string[];
    hooksPerAngle: number; // Number of hooks to generate per angle
    bannedPhrases?: string[]; // From StylePolicy
  },
  facts?: ProjectFacts | null,
): string {
  const personaDescriptions = project.personas
    .map(
      (p) =>
        `- ${p.name}: ${p.description}${p.painPoints.length ? ` (Pain: ${p.painPoints.slice(0, 3).join(', ')})` : ''}`,
    )
    .join('\n');

  const platformBlock = getPlatformPromptBlock(settings.platform);
  const languageBlock = getLanguageInstruction(project.language, project.region);

  const bannedSection = settings.bannedPhrases?.length
    ? `\n## BANNED PATTERNS (DO NOT USE)\n${settings.bannedPhrases.slice(0, 15).map((p) => `- "${p}"`).join('\n')}\n`
    : '';

  // Build angle-specific sections with guidance
  const angleSections = settings.angles
    .map((angleKey) => {
      const angle = getAngleConfig(angleKey);
      if (!angle) {
        return `## ${angleKey} (generate exactly ${settings.hooksPerAngle} hooks)`;
      }
      return `## ${angle.label} (generate exactly ${settings.hooksPerAngle} hooks)
${angle.hookGuidance}
Examples: ${angle.examples.map((e) => `"${e}"`).join(', ')}`;
    })
    .join('\n\n');

  const totalHooks = settings.angles.length * settings.hooksPerAngle;

  return `You are an expert UGC hook writer specializing in scroll-stopping opening lines.

${platformBlock}

## Product
${project.productDescription}

${languageBlock}## Target Audiences
${personaDescriptions || 'General audience'}

${buildFactsBlockForHooks(facts || null, project.forbiddenClaims)}
${bannedSection}
## VOICE & TONE (CRITICAL)
Write as if the creator is talking to a friend, NOT reading ad copy.
- Use contractions: "don't", "can't", "I'm", "you're"
- Vary your opening structures - NEVER start two hooks the same way
- Match the audience's vocabulary - if targeting gamers, use gaming terms; if targeting professionals, use industry language
- AVOID marketing speak: "experience", "seamless", "elevate", "leverage", "transform"

## Task
Generate EXACTLY ${settings.hooksPerAngle} hooks for EACH of the following angles.
Total hooks: ${settings.angles.length} angles × ${settings.hooksPerAngle} = ${totalHooks}

${angleSections}

## Hook Requirements
- Each hook must be 6-14 words
- Must grab attention in the first 2 seconds
- Should address a specific pain point, desire, or curiosity gap
- Follow the angle-specific guidance above
- CRITICAL: Each hook must start differently. No repeated first words across hooks.
- No two hooks should have the same structure or pattern

## BANNED HOOK PATTERNS (these are overused - avoid them)
- "Here's the thing..." / "Here's why..."
- "I kept seeing this..." / "Everyone's been asking..."
- "POV: You finally..."
- "Nobody talks about..."
- "Game changer" / "Life changer"
- Starting with "So..." without context
- Generic "This changed everything"
- Starting with "Okay" or "Okay," (overused casual opener)

## STRONG HOOK PATTERNS (prefer these approaches)
- Specific numbers: "I cut my editing time from 3 hours to 20 minutes"
- Unexpected contrast: "I spent $2000 on courses. This $30 tool worked better."
- Direct challenge: "Your hooks are boring. Here's proof."
- Confession format: "I've been lying to you about..."
- Mid-action start: "Wait wait wait - did that just work?"

Return as JSON object with angle keys:
{
  "${settings.angles[0]}": ["hook1", "hook2", ...],
  ${settings.angles.slice(1).map((a) => `"${a}": ["hook1", "hook2", ...]`).join(',\n  ')}
}

OUTPUT CONTRACT:
- Output must be valid JSON object
- Output must start with '{' and end with '}'
- Each angle key must have exactly ${settings.hooksPerAngle} hooks
- Do NOT wrap in markdown fences
- Do NOT include any explanation
- Each hook should be a plain string`;
}

export function buildRepairPrompt(rawOutput: string, error: string): string {
  return `The following output was supposed to be valid JSON but failed to parse:

Error: ${error}

Raw output:
${rawOutput}

Fix the JSON and return the corrected output.

OUTPUT CONTRACT (must follow exactly):
- Output must be valid JSON.
- Output must start with '{' or '[' and end with '}' or ']'.
- Do NOT wrap in markdown fences.
- Do NOT include any explanation, comments, or extra text.
- Do NOT include trailing commas.
If you include any characters before the first '{'/']' or after the final '}'/']', the output will be rejected.`;
}
