// Language name lookup map
const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese',
  nl: 'Dutch',
  pl: 'Polish',
  ru: 'Russian',
  uk: 'Ukrainian',
  ja: 'Japanese',
  ko: 'Korean',
  zh: 'Chinese',
  ar: 'Arabic',
  hi: 'Hindi',
  bn: 'Bengali',
  tr: 'Turkish',
  vi: 'Vietnamese',
  th: 'Thai',
  id: 'Indonesian',
  ms: 'Malay',
  sv: 'Swedish',
  da: 'Danish',
  no: 'Norwegian',
  fi: 'Finnish',
  cs: 'Czech',
  el: 'Greek',
  he: 'Hebrew',
  hu: 'Hungarian',
  ro: 'Romanian',
};

// Region name lookup map
const REGION_NAMES: Record<string, string> = {
  US: 'United States',
  GB: 'United Kingdom',
  CA: 'Canada',
  AU: 'Australia',
  NZ: 'New Zealand',
  IE: 'Ireland',
  DE: 'Germany',
  FR: 'France',
  ES: 'Spain',
  IT: 'Italy',
  PT: 'Portugal',
  NL: 'Netherlands',
  BE: 'Belgium',
  AT: 'Austria',
  CH: 'Switzerland',
  PL: 'Poland',
  SE: 'Sweden',
  NO: 'Norway',
  DK: 'Denmark',
  FI: 'Finland',
  JP: 'Japan',
  KR: 'South Korea',
  CN: 'China',
  TW: 'Taiwan',
  HK: 'Hong Kong',
  SG: 'Singapore',
  MY: 'Malaysia',
  TH: 'Thailand',
  VN: 'Vietnam',
  ID: 'Indonesia',
  PH: 'Philippines',
  IN: 'India',
  AE: 'United Arab Emirates',
  SA: 'Saudi Arabia',
  IL: 'Israel',
  TR: 'Turkey',
  RU: 'Russia',
  UA: 'Ukraine',
  BR: 'Brazil',
  MX: 'Mexico',
  AR: 'Argentina',
  CL: 'Chile',
  CO: 'Colombia',
  ZA: 'South Africa',
  EG: 'Egypt',
  NG: 'Nigeria',
  KE: 'Kenya',
  GH: 'Ghana',
};

/**
 * Get the display name for a language code
 */
export function getLanguageName(code: string): string {
  return LANGUAGE_NAMES[code] || code;
}

/**
 * Get the display name for a region code
 */
export function getRegionName(code: string): string {
  return REGION_NAMES[code] || code;
}

/**
 * Generate language instruction block for LLM prompts
 * Returns empty string for English (default), or a critical instruction for other languages
 */
export function getLanguageInstruction(language: string, region?: string | null): string {
  // English is the default - no special instruction needed
  if (language === 'en' || !language) {
    return '';
  }

  const langName = getLanguageName(language);
  const regionNote = region ? ` (targeting ${getRegionName(region)} region)` : '';

  return `## LANGUAGE REQUIREMENT (CRITICAL)
ALL script content MUST be written in ${langName}${regionNote}.
This includes: hooks, dialogue, on-screen text, CTAs, and instructions.
Do NOT use English - the ENTIRE output must be in ${langName}.
`;
}
