import { z } from 'zod';

export const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  productDescription: z.string().min(1).max(2000),
  offer: z.string().max(500).optional(),
  brandVoice: z.string().max(1000).optional(),
  forbiddenClaims: z.array(z.string()).optional(),
  platforms: z.array(z.enum(['tiktok', 'reels', 'shorts'])).min(1),
  language: z.string().default('en'),
  region: z.string().optional(),
});

export const updateProjectSchema = createProjectSchema.partial();

export type CreateProjectDto = z.infer<typeof createProjectSchema>;
export type UpdateProjectDto = z.infer<typeof updateProjectSchema>;

export const createPersonaSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(1000),
  demographics: z.string().max(500).optional(),
  painPoints: z.array(z.string()).optional(),
  desires: z.array(z.string()).optional(),
  objections: z.array(z.string()).optional(),
});

export const updatePersonaSchema = createPersonaSchema.partial();

export type CreatePersonaDto = z.infer<typeof createPersonaSchema>;
export type UpdatePersonaDto = z.infer<typeof updatePersonaSchema>;
