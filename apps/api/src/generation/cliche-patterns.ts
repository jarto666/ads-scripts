/**
 * Centralized cliché patterns for script quality scoring
 *
 * These patterns are used to detect overused, generic, or AI-smell content
 * and apply appropriate penalties to novelty and hook strength scores.
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

/**
 * Cliché pattern categories
 */
export const CLICHE_PATTERNS = {
  /**
   * Overused hook openers that kill scroll-stop power
   * Applied in hook scoring with -15 pts penalty (break after first match)
   */
  hookOpeners: [
    // Meta commentary / filler openers
    "here's the thing",
    "here's why",
    "here's how",
    "here's what",
    'okay so',
    'so basically',
    'real talk',
    'story time',
    'hear me out',
    'hot take',
    'unpopular opinion',
    'controversial opinion',
    'can we talk about',
    'we need to talk about',
    'let me tell you',

    // Discovery / exclusivity claims
    'i kept seeing',
    'i finally found',
    'i found the secret',
    'nobody talks about',
    'no one is talking about',
    'why is no one',
    "everyone's been asking",
    'people keep asking',

    // FOMO / urgency openers
    'stop scrolling if',
    'stop scrolling',
    'wait until you see',
    'you need to see this',
    'you need to know',
    "you won't believe",
    'this is your sign',
    "if you're seeing this",

    // Hyperbolic claims
    'this changed everything',
    'game changer',
    'life changer',
    'this changed my life',
    'best thing i ever',
    'wish i knew sooner',

    // POV / trend formats
    'pov: you finally',
    'pov: you just',
    'pov:',
    'the algorithm finally',
    'tiktok made me buy',
    'tiktok made me',
    'i need to tell you',
  ],

  /**
   * LLM-smell phrases that make content feel AI-generated
   * Applied in novelty scoring with -12 pts penalty per match
   */
  llmSmell: [
    // Business jargon
    'leverage',
    'synergy',
    'optimize',
    'utilize',
    'facilitate',
    'streamline',
    'maximize',
    'scalable',

    // Empty superlatives
    'comprehensive solution',
    'cutting-edge',
    'state-of-the-art',
    'industry-leading',
    'best-in-class',
    'world-class',
    'top-tier',
    'premium quality',

    // Transformation buzzwords
    'revolutionary',
    'groundbreaking',
    'game-changing',
    'paradigm shift',
    'holistic approach',
    'robust',
    'seamless experience',
    'seamlessly',
    'elevate your',
    'unlock the potential',
    'unlock your',
    'transform your',
    'empower yourself',
    'take it to the next level',
    'next level',

    // Vague action verbs
    'dive into',
    'dive in',
    'delve into',
    'embark on',
    'navigate the',
    'harness the power',
    'supercharge your',
    'revolutionize your',
    'amplify your',

    // Marketing fluff
    'unique blend',
    'perfect solution',
    'ultimate solution',
    'one-stop',
    'all-in-one',
    'effortlessly',
    'hassle-free',
  ],

  /**
   * Generic filler phrases that add no value
   * Applied in novelty scoring with -10 pts penalty per match
   */
  genericFiller: [
    // Reaction phrases
    "you won't believe",
    'this changed my life',
    'obsessed with',
    'absolutely love',
    'so amazing',
    'best thing ever',
    'you need this',
    'trust me on this',

    // Overused slang/memes
    'no cap',
    "it's giving",
    'hits different',
    'hit different',
    'iykyk',
    'say less',
    'main character energy',
    'living my best life',
    'i was today years old',

    // Filler phrases
    'the thing is',
    'that part',
    'not me doing',
    'the way i',
    'crying rn',
    'screaming',
    'im dead',
    "i'm dead",
    'no literally',
    'literally dying',

    // Generic endorsements
    'highly recommend',
    'would recommend',
    '10/10 recommend',
    '10 out of 10',
    'must have',
    'must-have',
    'life changing',
    'life-changing',
  ],

  /**
   * Structural patterns (regex) that indicate lazy writing
   * Applied in novelty scoring with -8 pts penalty per match
   */
  structures: [
    // Sentence starters
    { pattern: /(?:^|\.\s+)so\s/i, name: 'starts with So...' },
    { pattern: /^okay so\b/i, name: 'starts with Okay so' },
    { pattern: /^(so\s+)?basically\b/i, name: 'starts with Basically' },
    { pattern: /^wait\s+(wait\s+)?wait\b/i, name: 'repeated wait' },

    // Repetitive structures
    {
      pattern: /not\s+\w+,?\s*not\s+\w+,?\s*(just|only)/i,
      name: 'Not A, not B, just C',
    },
    {
      pattern: /no\s+\w+,?\s*no\s+\w+,?\s*(just|only)/i,
      name: 'No X, no Y, just Z',
    },
    { pattern: /\bif you're (tired|sick|struggling)/i, name: 'if you are tired of' },
    { pattern: /\b(am i|are we) the only (one|ones?)\b/i, name: 'am I the only one' },
    { pattern: /\bcan we (just )?appreciate\b/i, name: 'can we appreciate' },

    // Excessive punctuation
    { pattern: /\?.*\?.*\?/g, name: 'excessive questions' },
    { pattern: /\?\?+/g, name: 'multiple question marks' },
    { pattern: /!!+/g, name: 'multiple exclamation marks' },
    { pattern: /\.{4,}/g, name: 'excessive ellipsis' },

    // Repetitive words
    { pattern: /\byou guys\b.*\byou guys\b/i, name: 'repeated you guys' },
    { pattern: /\bliterally\b.*\bliterally\b/i, name: 'repeated literally' },
    { pattern: /\bjust\b.*\bjust\b.*\bjust\b/gi, name: 'triple just' },
    { pattern: /\blike\b.*\blike\b.*\blike\b.*\blike\b/gi, name: 'excessive like' },
    { pattern: /\bi literally cannot\b/i, name: 'i literally cannot' },

    // Trailing patterns
    { pattern: /right\?\s*$/i, name: 'ends with Right?' },
    { pattern: /,\s*right\?/gi, name: 'trailing right?' },
  ],

  /**
   * Excessive usage limits - penalize overuse, not first use
   * Applied when count exceeds max threshold
   */
  excessive: [
    { word: 'just', max: 2, penaltyPerExtra: -5 },
    { word: 'literally', max: 1, penaltyPerExtra: -8 },
    { word: 'like', max: 3, penaltyPerExtra: -3 },
    { word: 'really', max: 2, penaltyPerExtra: -4 },
    { word: 'amazing', max: 1, penaltyPerExtra: -5 },
    { word: 'actually', max: 2, penaltyPerExtra: -3 },
    { word: 'basically', max: 1, penaltyPerExtra: -5 },
    { pattern: /!/g, max: 3, penaltyPerExtra: -3 },
    { pattern: /\?/g, max: 4, penaltyPerExtra: -2 },
  ],
} as const;

/**
 * Pattern version for tracking changes
 */
export const CLICHE_PATTERNS_VERSION = '2.0.0';

/**
 * Helper type for excessive patterns
 */
export type ExcessivePattern = (typeof CLICHE_PATTERNS.excessive)[number];

/**
 * Helper type for structure patterns
 */
export type StructurePattern = (typeof CLICHE_PATTERNS.structures)[number];
