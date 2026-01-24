/**
 * Platform-specific profiles for UGC ad script generation.
 * These profiles inject concrete style guidance into prompts to make
 * outputs meaningfully different per platform.
 */

export interface PlatformProfile {
  name: string;
  pacing: string;
  hookStyle: string;
  captionDensity: string;
  editNotes: string;
  ctaStyle: string;
  tone: string;
}

export const PLATFORM_PROFILES: Record<string, PlatformProfile> = {
  universal: {
    name: 'Universal (All Platforms)',
    pacing: 'Fast but balanced, works everywhere',
    hookStyle: 'Strong opening that works on any feed, clear value prop upfront',
    captionDensity: 'Medium-high - readable overlays, not overwhelming',
    editNotes: 'Clean cuts, good lighting, phone-native but polished',
    ctaStyle: 'Platform-neutral ("Link in bio", "Check it out", "Learn more")',
    tone: 'Authentic UGC that fits TikTok, Reels, and Shorts equally',
  },
  tiktok: {
    name: 'TikTok',
    pacing: 'Very fast, aggressive pattern interrupts, high energy throughout',
    hookStyle: 'Bold first-frame stop-scroll, comment/objection framing, conversational and direct',
    captionDensity: 'High - punchy text overlays on most beats, bold keywords',
    editNotes: 'Jump cuts every 1-2s, handheld/phone-native feel, chaotic energy OK, strong visual in first frame',
    ctaStyle: 'Direct and urgent ("Get yours", "Try it now", "Link in bio")',
    tone: 'Raw, unpolished, native creator energy - like talking to a friend',
  },
  reels: {
    name: 'Instagram Reels',
    pacing: 'Fast but cleaner, less chaotic than TikTok',
    hookStyle: 'Relatable setup + aesthetic proof, polished UGC vibe, lifestyle-oriented',
    captionDensity: 'Medium-high - clean, readable overlays with good typography',
    editNotes: 'Smoother transitions, better lighting, Instagram-aesthetic, visually appealing',
    ctaStyle: 'Softer, brand-safe ("Learn more", "Shop the link", "Check it out")',
    tone: 'Elevated UGC, aspirational but authentic, slightly more polished than TikTok',
  },
  shorts: {
    name: 'YouTube Shorts',
    pacing: 'Fast but clarity-first, structured delivery',
    hookStyle: 'Clear promise + "here\'s how/why" framing, educational angle, less hype',
    captionDensity: 'Medium - fewer noisy overlays, cleaner text, easier to read',
    editNotes: 'Voiceover-friendly, structured beats, tutorial-adjacent, clear visual hierarchy',
    ctaStyle: 'Straightforward and neutral ("Check the link", "See description", "More below")',
    tone: 'Informative creator, less slang, more substance, YouTube audience expectations',
  },
};

/**
 * Beat count ranges by duration (in seconds).
 * These ensure scripts have appropriate pacing for their length.
 */
export const DURATION_BEAT_RANGES: Record<number, { min: number; max: number }> = {
  15: { min: 4, max: 6 },
  30: { min: 6, max: 10 },
  45: { min: 8, max: 14 },
};

/**
 * Get the default beat range for a duration.
 * Falls back to interpolation for non-standard durations.
 */
export function getBeatRange(duration: number): { min: number; max: number } {
  if (DURATION_BEAT_RANGES[duration]) {
    return DURATION_BEAT_RANGES[duration];
  }

  // Interpolate for non-standard durations
  // Roughly 1 beat per 3-5 seconds
  const min = Math.max(3, Math.floor(duration / 5));
  const max = Math.ceil(duration / 2.5);
  return { min, max };
}

/**
 * Generate the platform profile block to inject into prompts.
 */
export function getPlatformPromptBlock(platform: string): string {
  const profile = PLATFORM_PROFILES[platform] || PLATFORM_PROFILES.universal;

  return `## Platform: ${profile.name}
- Pacing: ${profile.pacing}
- Hook Style: ${profile.hookStyle}
- Caption Density: ${profile.captionDensity}
- Edit Notes: ${profile.editNotes}
- CTA Style: ${profile.ctaStyle}
- Tone: ${profile.tone}

Tailor all hooks, dialogue, pacing, and storyboard directions to match this platform's native advertising style.`;
}

/**
 * Generate beat count guidance for prompts.
 */
export function getBeatCountGuidance(duration: number): string {
  const range = getBeatRange(duration);
  return `For a ${duration}s script, include ${range.min}-${range.max} storyboard beats (segments). Each beat should be ${(duration / range.max).toFixed(1)}-${(duration / range.min).toFixed(1)} seconds on average.`;
}

/**
 * Validate beat count and return warning message if invalid.
 * Returns null if valid.
 */
export function validateBeatCount(
  storyboard: unknown[] | undefined,
  duration: number,
): string | null {
  if (!storyboard || !Array.isArray(storyboard)) {
    return 'Script has no storyboard';
  }

  const beatCount = storyboard.length;
  const range = getBeatRange(duration);

  if (beatCount < range.min) {
    return `Script has only ${beatCount} beats for ${duration}s duration (expected ${range.min}-${range.max}). May feel too slow or lack visual variety.`;
  }

  if (beatCount > range.max) {
    return `Script has ${beatCount} beats for ${duration}s duration (expected ${range.min}-${range.max}). May be unrealistic to film with this many cuts.`;
  }

  return null;
}
