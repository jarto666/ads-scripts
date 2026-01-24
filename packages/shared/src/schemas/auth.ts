import { z } from 'zod';

export const requestMagicLinkSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const consumeMagicLinkSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

export type RequestMagicLinkDto = z.infer<typeof requestMagicLinkSchema>;
export type ConsumeMagicLinkDto = z.infer<typeof consumeMagicLinkSchema>;

export interface AuthUser {
  id: string;
  email: string;
  createdAt: Date;
}

export interface AuthResponse {
  user: AuthUser;
  accessToken?: string;
}
