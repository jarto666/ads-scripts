/**
 * Script angle definitions with hook generation guidance.
 * Each angle has specific prompts to guide the LLM in generating
 * angle-appropriate hooks.
 */

export interface AngleConfig {
  label: string;
  hookGuidance: string;
  scriptStructureGuidance: string;
  visualDirection: string;
  examples: string[];
}

export const SCRIPT_ANGLES: Record<string, AngleConfig> = {
  pain_agitation: {
    label: 'Pain Agitation',
    hookGuidance:
      'Focus on frustration and problems. Start with the struggle. Use phrases like "tired of", "sick of", "frustrated with", "hate when".',
    scriptStructureGuidance:
      'Structure: (1) Hook with intense pain point, (2) Agitate by showing consequences or how bad it gets, (3) Brief product intro as relief, (4) Show the relief/solution working, (5) CTA. Keep 60% of script on the pain/agitation before introducing solution. The viewer should FEEL the frustration before seeing the way out.',
    visualDirection:
      'The frustration must be VISIBLE. Show the problem physically - facial expressions, body language, or the problem itself on screen. The viewer should feel the pain before you introduce the solution.',
    examples: [
      'Stop scrolling if you\'re tired of...',
      'Why does nobody talk about...',
      'I was so frustrated with... until I found this',
    ],
  },
  social_proof: {
    label: 'Social Proof',
    hookGuidance:
      'Reference what others are doing. Use "everyone", "people are obsessed", "went viral", "thousands of people". Show popularity and validation.',
    scriptStructureGuidance:
      'Structure: (1) Hook referencing what others are doing/saying, (2) Show evidence of popularity (comments, reviews, testimonials, numbers), (3) Explain why people love it, (4) Show yourself joining/using it, (5) CTA to join the community. Throughout the script, keep referencing OTHER people\'s experiences and opinions. The viewer should feel like they\'re missing out on something everyone else knows about.',
    visualDirection:
      'Show EVIDENCE of others. This could be comments, reviews, multiple people, or crowd reactions. The viewer should see that real people validate this - don\'t just say it, show it.',
    examples: [
      'Everyone\'s been asking me about...',
      'This is why 10k people switched to...',
      'POV: You finally try what everyone\'s talking about',
    ],
  },
  before_after: {
    label: 'Before/After',
    hookGuidance:
      'Contrast old way vs new result. Focus on transformation and dramatic change. Use "I used to... now I...", "Before vs after".',
    scriptStructureGuidance:
      'Structure: (1) Hook showing the "before" state clearly, (2) Dwell on how bad/inconvenient the before was, (3) Introduce the product as the turning point, (4) Show the dramatic "after" result, (5) Emphasize the contrast one more time, (6) CTA. Use visual or verbal contrast language throughout: "used to... now", "before... after", "old way... new way". The transformation should feel dramatic and clear.',
    visualDirection:
      'The contrast must be OBVIOUS at a glance. Whether split-screen, side-by-side, or sequential - the viewer should instantly see the difference. Don\'t be subtle.',
    examples: [
      'I used to spend 3 hours on this, now it takes 10 minutes',
      'Before vs after using...',
      'My skin 6 months ago vs now',
    ],
  },
  curiosity_hook: {
    label: 'Curiosity Hook',
    hookGuidance:
      'Create information gaps. Make them need to know more. Use incomplete statements, teasers, and "the reason why". Don\'t give away the answer.',
    scriptStructureGuidance:
      'Structure: (1) Hook with incomplete statement or intriguing question, (2) Build suspense - hint at the answer without revealing it, (3) Reveal the insight/secret gradually, (4) Connect it to the product, (5) CTA with curiosity payoff. Maintain the information gap as long as possible. Use phrases like "here\'s the thing", "what I discovered", "the secret is". The viewer should feel they\'re learning insider knowledge.',
    visualDirection:
      'Visually TEASE without revealing. Hide, blur, or delay the payoff. Use framing that builds anticipation - the viewer should lean in wanting to see more.',
    examples: [
      'The reason your X isn\'t working...',
      'Nobody tells you this about...',
      'I wish someone told me this sooner',
    ],
  },
  problem_solution: {
    label: 'Problem/Solution',
    hookGuidance:
      'Present a clear problem then hint at the solution. Use "If you struggle with X", "The fix for X", "Here\'s what actually works".',
    scriptStructureGuidance:
      'Structure: (1) Hook naming a specific problem, (2) Validate the problem - show you understand it, (3) Introduce the solution directly, (4) Show how the solution works, (5) Show the result, (6) CTA. This is direct and logical - problem stated, solution provided. Use clear cause-and-effect language: "the problem is... the fix is...", "this happens because... so you need...".',
    visualDirection:
      'Show the problem in context, then show the solution working. The visual transition from problem→solution should feel like relief or resolution.',
    examples: [
      'If you struggle with X, here\'s what actually works',
      'The fix for X that no one talks about',
      'Struggling with X? This changed everything',
    ],
  },
  objection_reversal: {
    label: 'Objection Reversal',
    hookGuidance:
      'Address common objections or misconceptions head-on. Use "I thought... until", "You don\'t need... to get...", "Turns out... was wrong".',
    scriptStructureGuidance:
      'Structure: (1) Hook stating the objection/misconception you had, (2) Explain why you thought that way, (3) Reveal what changed your mind, (4) Show proof that the objection was wrong, (5) New perspective/result, (6) CTA. The script should feel like a mindset shift. Use language like "I was skeptical", "I assumed", "but then I realized", "turns out". Acknowledge the viewer probably has the same objection.',
    visualDirection:
      'Show the skepticism, then show the mind-change moment. Body language and facial expressions should reflect the shift from doubt to belief.',
    examples: [
      'I thought X was too expensive until...',
      'You don\'t need Y to get Z',
      'I was wrong about X. Here\'s why.',
    ],
  },
  urgency_scarcity: {
    label: 'Urgency/Scarcity',
    hookGuidance:
      'Create time pressure or limited availability. Use "almost missed", "before it\'s gone", "limited time", "running out". Create FOMO.',
    scriptStructureGuidance:
      'Structure: (1) Hook with urgency/scarcity element, (2) Explain why it\'s limited or time-sensitive, (3) Quick product value prop, (4) Reinforce the urgency - what happens if they miss it, (5) Urgent CTA. Keep urgency present throughout - mention time limits, stock levels, or exclusivity multiple times. Use phrases like "before it\'s gone", "only X left", "ends soon", "don\'t wait". The viewer should feel the pressure to act NOW.',
    visualDirection:
      'The energy should feel RUSHED. Fast pacing, grabbing motions, time pressure cues. The viewer should feel the urgency visually, not just hear it.',
    examples: [
      'I almost missed this...',
      'Before this gets taken down...',
      'They\'re discontinuing this and I\'m stocking up',
    ],
  },
  transformation: {
    label: 'Transformation',
    hookGuidance:
      'Focus on personal change and results. Use "How I went from X to Y", "The moment everything changed", journey language. Show the before and after state.',
    scriptStructureGuidance:
      'Structure: (1) Hook with transformation claim, (2) Brief "where I started" context, (3) The journey/process with the product, (4) The result achieved, (5) Reflection on the change, (6) CTA to start their journey. This is story-driven and personal. Use journey language: "my journey", "along the way", "looking back", "now I...". The viewer should see themselves in your transformation story and believe they can achieve similar results.',
    visualDirection:
      'Show the JOURNEY, not just the result. Progress markers, time passing, effort invested. End state should feel earned compared to start state.',
    examples: [
      'How I went from X to Y in Z time',
      'The moment everything changed...',
      'From struggling to thriving in 30 days',
    ],
  },
} as const;

/**
 * Get angle config by key, with fallback for unknown angles
 */
export function getAngleConfig(angleKey: string): AngleConfig | undefined {
  return SCRIPT_ANGLES[angleKey];
}

/**
 * Get all available angle keys
 */
export function getAngleKeys(): string[] {
  return Object.keys(SCRIPT_ANGLES);
}
