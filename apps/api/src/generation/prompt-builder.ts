import { Project, Persona } from '@prisma/client';

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

  return `You are an expert UGC video script planner for ${settings.platform.toUpperCase()} ads.

## Product
${project.productDescription}
${project.offer ? `Offer: ${project.offer}` : ''}

## Target Audiences
${personaDescriptions || 'General audience'}

${project.brandVoice ? `## Brand Voice\n${project.brandVoice}` : ''}

${project.forbiddenClaims.length ? `## Forbidden Claims (DO NOT USE)\n${project.forbiddenClaims.map((c) => `- ${c}`).join('\n')}` : ''}

## Task
Generate ${settings.count} unique script PLANS covering these angles: ${settings.angles.join(', ')}
Each plan should have a duration from: ${settings.durations.join('s, ')}s

For each plan, provide:
1. angle: One of the specified angles
2. duration: Target duration in seconds
3. hookIdea: A compelling hook idea (one line, must grab attention in first 2 seconds)
4. beats: 6-10 bullet points outlining the script structure
5. complianceNotes: Any potential compliance risks or notes

Distribute plans across angles and durations evenly.

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

  return `You are an expert UGC video script writer for ${platform.toUpperCase()}.

## Product
${project.productDescription}
${project.offer ? `Offer: ${project.offer}` : ''}

## Target Audience
${personaContext || 'General audience'}

${project.brandVoice ? `## Brand Voice\n${project.brandVoice}` : ''}

${project.forbiddenClaims.length ? `## FORBIDDEN (Never use these):\n${project.forbiddenClaims.map((c) => `- "${c}"`).join('\n')}` : ''}

## Script Plan to Expand
Angle: ${plan.angle}
Duration: ${plan.duration}s
Hook Idea: ${plan.hookIdea}
Beats: ${plan.beats.join(' → ')}
Compliance Notes: ${plan.complianceNotes.join(', ') || 'None'}

## Task
Write a complete script following this EXACT JSON structure:

{
  "angle": "${plan.angle}",
  "duration": ${plan.duration},
  "hook": "The opening hook line (must be attention-grabbing, specific, and under 3 seconds)",
  "storyboard": [
    {
      "t": "0-3s",
      "shot": "Description of what's in frame and the action",
      "onScreen": "Text overlay for this segment",
      "spoken": "Exact words the creator says",
      "broll": ["Optional b-roll idea 1", "Optional b-roll idea 2"]
    },
    // Continue for each segment...
  ],
  "ctaVariants": [
    "CTA option 1",
    "CTA option 2",
    "CTA option 3"
  ],
  "filmingChecklist": [
    "Specific filming instruction 1",
    "Props needed",
    "Lighting note",
    "etc."
  ],
  "warnings": ["Any compliance warnings or notes"]
}

REQUIREMENTS:
- The hook MUST grab attention in the first 2 seconds
- Storyboard should have 4-8 segments depending on duration
- Each spoken line should be natural and conversational
- Include specific, actionable filming instructions
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
