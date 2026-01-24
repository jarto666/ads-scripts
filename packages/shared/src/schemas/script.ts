import { z } from 'zod';

export const storyboardStepSchema = z.object({
  t: z.string(), // e.g., "0-2s"
  shot: z.string(), // what is in frame + action
  onScreen: z.string(), // text overlay
  spoken: z.string(), // line spoken by creator
  broll: z.array(z.string()).optional(), // optional b-roll ideas
});

export const scriptOutputSchema = z.object({
  angle: z.string(),
  duration: z.number(), // 15 | 30 | 45
  hook: z.string(),
  storyboard: z.array(storyboardStepSchema),
  ctaVariants: z.array(z.string()),
  filmingChecklist: z.array(z.string()),
  warnings: z.array(z.string()).optional(),
});

export const scriptPlanSchema = z.object({
  angle: z.string(),
  duration: z.number(),
  hookIdea: z.string(),
  beats: z.array(z.string()), // 6-10 bullet steps
  complianceNotes: z.array(z.string()).optional(),
});

export type StoryboardStep = z.infer<typeof storyboardStepSchema>;
export type ScriptOutput = z.infer<typeof scriptOutputSchema>;
export type ScriptPlan = z.infer<typeof scriptPlanSchema>;

// Batch settings
export const platformSchema = z.enum(['tiktok', 'reels', 'shorts']);
export const durationSchema = z.union([z.literal(15), z.literal(30), z.literal(45)]);

export const createBatchSchema = z.object({
  requestedCount: z.number().min(1).max(200),
  platform: platformSchema,
  angles: z.array(z.string()).min(1),
  durations: z.array(durationSchema).min(1),
});

export type Platform = z.infer<typeof platformSchema>;
export type Duration = z.infer<typeof durationSchema>;
export type CreateBatchDto = z.infer<typeof createBatchSchema>;

// Regenerate instruction
export const regenerateSchema = z.object({
  instruction: z.string().min(1),
});

export type RegenerateDto = z.infer<typeof regenerateSchema>;
