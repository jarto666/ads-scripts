/**
 * Centralized cliché scoring penalties.
 *
 * Pattern DATA now lives in StylePolicy (DB).
 * Only scoring constants and types remain here.
 */

/**
 * Scoring penalties for each category
 */
export const CLICHE_PENALTIES = {
  hookOpener: -15, // Per match in hook (break after first)
  llmSmell: -12, // Per match anywhere
  genericFiller: -10, // Per match anywhere
  structure: -8, // Per regex match
} as const;
