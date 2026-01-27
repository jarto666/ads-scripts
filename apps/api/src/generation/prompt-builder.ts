import { Project, Persona } from '@prisma/client';
import {
  getPlatformPromptBlock,
  getBeatCountGuidance,
  getBeatRange,
} from './platform-profiles';
import { getLanguageInstruction } from './language-utils';

interface ScriptPlan {
  angle: string;
  duration: number;
  hookIdea: string;
  beats: string[];
  complianceNotes: string[];
}

export function buildPass1Prompt(
  project: Project & { personas: Persona[] },
  settings: {
    platform: string;
    angles: string[];
    durations: number[];
    count: number;
  },
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
${project.offer ? `\nOffer: ${project.offer}` : ''}

${languageBlock}## Target Audiences
${personaDescriptions || 'General audience'}

${project.brandVoice ? `## Brand Voice\n${project.brandVoice}\n` : ''}
${project.forbiddenClaims.length ? `## Forbidden Claims (DO NOT USE)\n${project.forbiddenClaims.map((c) => `- ${c}`).join('\n')}\n` : ''}
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
    "beats": ["Hook with pain point", "Show the struggle", "Introduce solution", ...],
    "complianceNotes": ["Avoid medical claims"]
  },
  ...
]

IMPORTANT: Return ONLY valid JSON, no markdown, no explanation.`;
}

export function buildPass2Prompt(
  project: Project & { personas: Persona[] },
  plan: ScriptPlan,
  platform: string,
): string {
  const personaContext = project.personas
    .map((p) => `${p.name}: ${p.description}`)
    .join('; ');

  const platformBlock = getPlatformPromptBlock(platform);
  const beatRange = getBeatRange(plan.duration);
  const languageBlock = getLanguageInstruction(project.language, project.region);

  return `You are an expert UGC video ad script writer specializing in short-form vertical content.

${platformBlock}

## Product
${project.productDescription}
${project.offer ? `\nOffer: ${project.offer}` : ''}

${languageBlock}## Target Audience
${personaContext || 'General audience'}

${project.brandVoice ? `## Brand Voice\n${project.brandVoice}\n` : ''}
${project.forbiddenClaims.length ? `## FORBIDDEN (Never use these):\n${project.forbiddenClaims.map((c) => `- "${c}"`).join('\n')}\n` : ''}
## Script Plan to Expand
Angle: ${plan.angle}
Duration: ${plan.duration}s
Hook Idea: ${plan.hookIdea}
Beats: ${plan.beats.join(' → ')}
Compliance Notes: ${plan.complianceNotes.join(', ') || 'None'}

## Task
Write a complete PAID AD script following this EXACT JSON structure:

{
  "angle": "${plan.angle}",
  "duration": ${plan.duration},
  "hook": "The opening hook line (must be attention-grabbing, specific, and under 3 seconds)",
  "storyboard": [
    {
      "t": "0-3s",
      "shot": "Description of what's in frame and the action",
      "onScreen": "Text overlay for this segment (match platform caption density)",
      "spoken": "Exact words the creator says (match platform tone)",
      "broll": ["Optional b-roll idea 1", "Optional b-roll idea 2"]
    },
    // Continue for each segment...
  ],
  "ctaVariants": [
    "CTA option 1 (match platform CTA style)",
    "CTA option 2",
    "CTA option 3"
  ],
  "filmingChecklist": [
    "Specific filming instruction 1",
    "Props needed",
    "Lighting note (match platform edit notes)",
    "etc."
  ],
  "warnings": ["Any compliance warnings or notes"]
}

REQUIREMENTS:
- The hook MUST grab attention in the first 2 seconds, matching the platform's hook style
- Storyboard should have ${beatRange.min}-${beatRange.max} segments for this ${plan.duration}s duration
- Each spoken line should match the platform's tone (see Platform section above)
- onScreen captions should match the platform's caption density expectations
- CTAs should match the platform's CTA style (not generic)
- Include specific, actionable filming instructions matching platform edit notes
- If any forbidden phrases appear, add a warning
- Time segments should add up to ~${plan.duration}s

Return ONLY valid JSON, no markdown, no explanation.`;
}

export function buildRepairPrompt(rawOutput: string, error: string): string {
  return `The following output was supposed to be valid JSON but failed to parse:

Error: ${error}

Raw output:
${rawOutput}

Please fix the JSON and return ONLY the corrected, valid JSON object. Do not include any explanation or markdown.`;
}
