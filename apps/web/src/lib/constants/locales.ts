import type { ComboboxOption } from "@/components/ui/combobox";

// Common languages with ISO 639-1 codes (alphabetically sorted)
export const LANGUAGES: ComboboxOption[] = [
  { value: "ar", label: "Arabic (العربية)", searchTerms: ["arabic", "arabiya"] },
  { value: "bn", label: "Bengali (বাংলা)", searchTerms: ["bengali", "bangla", "bangladesh"] },
  { value: "zh", label: "Chinese (中文)", searchTerms: ["chinese", "mandarin", "zhongwen", "china"] },
  { value: "cs", label: "Czech (Čeština)", searchTerms: ["czech", "cestina", "czechia"] },
  { value: "da", label: "Danish (Dansk)", searchTerms: ["danish", "dansk", "denmark"] },
  { value: "nl", label: "Dutch (Nederlands)", searchTerms: ["dutch", "netherlands", "holland"] },
  { value: "en", label: "English", searchTerms: ["english", "anglais"] },
  { value: "fi", label: "Finnish (Suomi)", searchTerms: ["finnish", "suomi", "finland"] },
  { value: "fr", label: "French (Français)", searchTerms: ["french", "francais"] },
  { value: "de", label: "German (Deutsch)", searchTerms: ["german", "deutsch"] },
  { value: "el", label: "Greek (Ελληνικά)", searchTerms: ["greek", "ellinika", "greece"] },
  { value: "he", label: "Hebrew (עברית)", searchTerms: ["hebrew", "ivrit", "israel"] },
  { value: "hi", label: "Hindi (हिन्दी)", searchTerms: ["hindi", "india"] },
  { value: "hu", label: "Hungarian (Magyar)", searchTerms: ["hungarian", "magyar", "hungary"] },
  { value: "id", label: "Indonesian (Bahasa Indonesia)", searchTerms: ["indonesian", "bahasa"] },
  { value: "it", label: "Italian (Italiano)", searchTerms: ["italian", "italiano"] },
  { value: "ja", label: "Japanese (日本語)", searchTerms: ["japanese", "nihongo", "japan"] },
  { value: "ko", label: "Korean (한국어)", searchTerms: ["korean", "hangugeo", "korea"] },
  { value: "ms", label: "Malay (Bahasa Melayu)", searchTerms: ["malay", "melayu", "malaysia"] },
  { value: "no", label: "Norwegian (Norsk)", searchTerms: ["norwegian", "norsk", "norway"] },
  { value: "pl", label: "Polish (Polski)", searchTerms: ["polish", "polski", "poland"] },
  { value: "pt", label: "Portuguese (Português)", searchTerms: ["portuguese", "portugues", "brasileiro"] },
  { value: "ro", label: "Romanian (Română)", searchTerms: ["romanian", "romana", "romania"] },
  { value: "ru", label: "Russian (Русский)", searchTerms: ["russian", "russkiy"] },
  { value: "es", label: "Spanish (Español)", searchTerms: ["spanish", "espanol", "castellano"] },
  { value: "sv", label: "Swedish (Svenska)", searchTerms: ["swedish", "svenska", "sweden"] },
  { value: "th", label: "Thai (ไทย)", searchTerms: ["thai", "thailand"] },
  { value: "tr", label: "Turkish (Türkçe)", searchTerms: ["turkish", "turkce", "turkey"] },
  { value: "uk", label: "Ukrainian (Українська)", searchTerms: ["ukrainian", "ukrayinska"] },
  { value: "vi", label: "Vietnamese (Tiếng Việt)", searchTerms: ["vietnamese", "vietnam"] },
];

// Common regions/countries with ISO 3166-1 alpha-2 codes (alphabetically sorted)
export const REGIONS: ComboboxOption[] = [
  { value: "AR", label: "Argentina", searchTerms: ["argentinian"] },
  { value: "AU", label: "Australia", searchTerms: ["aussie", "australian"] },
  { value: "AT", label: "Austria", searchTerms: ["osterreich", "austrian"] },
  { value: "BE", label: "Belgium", searchTerms: ["belgian"] },
  { value: "BR", label: "Brazil", searchTerms: ["brazilian", "brasil"] },
  { value: "CA", label: "Canada", searchTerms: ["canadian"] },
  { value: "CL", label: "Chile", searchTerms: ["chilean"] },
  { value: "CN", label: "China", searchTerms: ["chinese", "zhongguo"] },
  { value: "CO", label: "Colombia", searchTerms: ["colombian"] },
  { value: "DK", label: "Denmark", searchTerms: ["danish", "danmark"] },
  { value: "EG", label: "Egypt", searchTerms: ["egyptian", "misr"] },
  { value: "FI", label: "Finland", searchTerms: ["finnish", "suomi"] },
  { value: "FR", label: "France", searchTerms: ["french"] },
  { value: "DE", label: "Germany", searchTerms: ["deutschland", "german"] },
  { value: "GH", label: "Ghana", searchTerms: ["ghanaian"] },
  { value: "HK", label: "Hong Kong", searchTerms: ["hongkong"] },
  { value: "IN", label: "India", searchTerms: ["indian", "bharat"] },
  { value: "ID", label: "Indonesia", searchTerms: ["indonesian"] },
  { value: "IE", label: "Ireland", searchTerms: ["irish"] },
  { value: "IL", label: "Israel", searchTerms: ["israeli"] },
  { value: "IT", label: "Italy", searchTerms: ["italia", "italian"] },
  { value: "JP", label: "Japan", searchTerms: ["japanese", "nippon"] },
  { value: "KE", label: "Kenya", searchTerms: ["kenyan"] },
  { value: "MY", label: "Malaysia", searchTerms: ["malaysian"] },
  { value: "MX", label: "Mexico", searchTerms: ["mexican"] },
  { value: "NL", label: "Netherlands", searchTerms: ["holland", "dutch"] },
  { value: "NZ", label: "New Zealand", searchTerms: ["kiwi"] },
  { value: "NG", label: "Nigeria", searchTerms: ["nigerian"] },
  { value: "NO", label: "Norway", searchTerms: ["norwegian", "norge"] },
  { value: "PH", label: "Philippines", searchTerms: ["filipino", "pinoy"] },
  { value: "PL", label: "Poland", searchTerms: ["polish", "polska"] },
  { value: "PT", label: "Portugal", searchTerms: ["portuguese"] },
  { value: "RU", label: "Russia", searchTerms: ["russian", "rossiya"] },
  { value: "SA", label: "Saudi Arabia", searchTerms: ["saudi", "arabic"] },
  { value: "SG", label: "Singapore", searchTerms: ["singaporean"] },
  { value: "ZA", label: "South Africa", searchTerms: ["african"] },
  { value: "KR", label: "South Korea", searchTerms: ["korean", "hanguk"] },
  { value: "ES", label: "Spain", searchTerms: ["espana", "spanish"] },
  { value: "SE", label: "Sweden", searchTerms: ["swedish", "sverige"] },
  { value: "CH", label: "Switzerland", searchTerms: ["swiss", "schweiz", "suisse"] },
  { value: "TW", label: "Taiwan", searchTerms: ["taiwanese"] },
  { value: "TH", label: "Thailand", searchTerms: ["thai"] },
  { value: "TR", label: "Turkey", searchTerms: ["turkish", "turkiye"] },
  { value: "UA", label: "Ukraine", searchTerms: ["ukrainian"] },
  { value: "AE", label: "United Arab Emirates", searchTerms: ["uae", "dubai", "emirati"] },
  { value: "GB", label: "United Kingdom", searchTerms: ["uk", "britain", "england"] },
  { value: "US", label: "United States", searchTerms: ["usa", "america"] },
  { value: "VN", label: "Vietnam", searchTerms: ["vietnamese"] },
];

// Language name lookup map for backend use
export const LANGUAGE_NAMES: Record<string, string> = LANGUAGES.reduce(
  (acc, lang) => {
    // Extract just the English name (before parentheses if present)
    const englishName = lang.label.split(" (")[0];
    acc[lang.value] = englishName;
    return acc;
  },
  {} as Record<string, string>
);

// Region name lookup map for backend use
export const REGION_NAMES: Record<string, string> = REGIONS.reduce(
  (acc, region) => {
    acc[region.value] = region.label;
    return acc;
  },
  {} as Record<string, string>
);

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
