// Auth schemas and types
export * from './schemas/auth';

// Project and persona schemas and types
export * from './schemas/project';

// Script schemas and types
export * from './schemas/script';

// Constants
export const SCRIPT_ANGLES = [
  'pain_agitation',
  'objection_reversal',
  'social_proof',
  'before_after',
  'problem_solution',
  'curiosity_hook',
  'urgency_scarcity',
  'transformation',
  'comparison',
  'myth_buster',
] as const;

export type ScriptAngle = (typeof SCRIPT_ANGLES)[number];

export const SCRIPT_DURATIONS = [15, 30, 45] as const;

export const PLATFORMS = ['tiktok', 'reels', 'shorts'] as const;
