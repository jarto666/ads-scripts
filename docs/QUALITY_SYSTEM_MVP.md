# Quality System MVP Specification

> **Version:** 1.1
> **Status:** Draft
> **Based on:** User feedback analysis + architecture discussions + model benchmarks (2026-01-30)

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Database Schema](#database-schema)
4. [StylePolicy: English Patterns](#stylepolicy-english-patterns)
5. [Pipeline: Generate → Filter → Rerank](#pipeline-generate--filter--rerank)
6. [Scoring System](#scoring-system)
7. [Hallucination Detection](#hallucination-detection)
8. [Feedback UI](#feedback-ui)
9. [Quality Metrics](#quality-metrics)
10. [Implementation Phases](#implementation-phases)

---

## Overview

### Problem Statement

Current script generation produces "ChatGPT-ish" output that experienced marketers recognize immediately:
- Overuse of "just", "literally", "!!!"
- Clichéd patterns: "Not A, not B, just C"
- Weak/generic hooks
- Hallucinated features and promos
- Unnatural UGC voice

### Solution

A three-layer quality system with a **Generate → Filter → Rerank** pipeline:

```
┌─────────────────────────────────────────────────────────────┐
│                    QUALITY LAYERS                           │
├─────────────────────────────────────────────────────────────┤
│  Layer 1: StylePolicy (language-specific rules)             │
│  Layer 2: ProjectFacts (product ground truth)               │
│  Layer 3: UserPreferences (account-level settings)          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                      PIPELINE                               │
├─────────────────────────────────────────────────────────────┤
│  Generate (20 hooks → 8 scripts) →                          │
│  Filter (hard rules) →                                      │
│  Rerank (scoring) →                                         │
│  Return Top N                                               │
└─────────────────────────────────────────────────────────────┘
```

### Key Principle: English-First

Multi-language support requires separate: slang, clichés, hooks, compliance patterns per language. We optimize English first, expand when metrics justify.

**UI messaging:**
- English: "Recommended"
- Other languages: "Beta - output may be more generic"

---

## Model Selection (Benchmark Results: 2026-01-30)

### Benchmark Summary

We tested 4 models with 5 scripts each on the same product/prompts:

| Model | Quality Score | Cost/Script | Speed | Notes |
|-------|---------------|-------------|-------|-------|
| **Gemini 3 Pro** | **88/100** | $0.029 | 135s | Best quality, 2 perfect scores |
| **Haiku 4.5** | 78/100 | $0.009 | 75s | Good value, reliable |
| **Gemini 3 Flash** | 68/100 | $0.004 | 47s | Cheapest, decent quality |
| **Sonnet 4.5** | 49/100 | $0.023 | 154s | ⚠️ Overuses "just/literally" |

**Key Finding:** Sonnet 4.5 consistently scored lowest due to excessive use of "just" (3+ per script) and "literally" (2-3 per script) - exactly what the user feedback complained about.

### Model Pricing (OpenRouter, per 1M tokens)

| Model | Input | Output | Total Context |
|-------|-------|--------|---------------|
| `google/gemini-3-flash-preview` | $0.50 | $3.00 | 1.05M |
| `anthropic/claude-haiku-4.5` | $1.00 | $5.00 | 200K |
| `google/gemini-3-pro-preview` | $2.00 | $12.00 | 1.05M |
| `anthropic/claude-sonnet-4.5` | $3.00 | $15.00 | 200K |

### Recommended Model Configuration

```typescript
// config/models.ts

export const MODEL_CONFIG = {
  // Script generation
  scriptGeneration: {
    standard: {
      model: 'google/gemini-3-flash-preview',
      temperature: 0.7,
      maxTokens: 4096,
    },
    premium: {
      model: 'google/gemini-3-pro-preview',
      temperature: 0.7,
      maxTokens: 4096,
    },
  },

  // Hook brainstorming (overgeneration step)
  hookGeneration: {
    model: 'google/gemini-3-flash-preview',
    temperature: 0.9, // Higher for creativity
    maxTokens: 2048,
  },

  // Persona generation (Pro feature)
  personaGeneration: {
    model: 'google/gemini-3-flash-preview',
    temperature: 0.7,
    maxTokens: 1024,
  },

  // URL import analysis
  urlAnalysis: {
    model: 'google/gemini-3-flash-preview',
    temperature: 0.5, // Lower for accuracy
    maxTokens: 4096,
  },
};
```

### Migration from Current Models

| Feature | Current Model | New Model | Cost Change |
|---------|---------------|-----------|-------------|
| Standard scripts | claude-3.5-haiku | gemini-3-flash-preview | -50% |
| Premium scripts | claude-sonnet-4.5 | gemini-3-pro-preview | Similar |
| Persona generation | claude-3.5-haiku | gemini-3-flash-preview | -40% |
| URL analysis | claude-3-5-haiku | gemini-3-flash-preview | -40% |

### Why Not Sonnet 4.5?

Despite being Anthropic's premium model, Sonnet 4.5 performed poorly for UGC scripts:

1. **Overuses filler words:** 3+ "just", 2-3 "literally" per script
2. **More clichéd:** Higher rate of banned patterns
3. **Slower:** 154s vs 135s for Gemini 3 Pro
4. **More expensive:** $0.023 vs $0.029 for lower quality

Sample problematic output from Sonnet 4.5:
```
"I just spent literally twelve hours on this mix and it still sounds like
trash compared to the beats I find on YouTube"
```

vs Gemini 3 Pro:
```
"I actually want to cry right now."
```

The Gemini output is more natural and emotionally engaging.

---

## Architecture

### System Components

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   StylePolicy    │     │   ProjectFacts   │     │ UserPreferences  │
│   (per language) │     │   (per project)  │     │  (per account)   │
└────────┬─────────┘     └────────┬─────────┘     └────────┬─────────┘
         │                        │                        │
         └────────────────────────┼────────────────────────┘
                                  ↓
                    ┌─────────────────────────┐
                    │   Generation Pipeline   │
                    │  Generate → Filter →    │
                    │  Rerank → Return        │
                    └────────────┬────────────┘
                                 ↓
                    ┌─────────────────────────┐
                    │    ScriptOutcome        │
                    │   (feedback tracking)   │
                    └─────────────────────────┘
```

### Data Flow

1. User requests N scripts
2. System loads: StylePolicy (by language) + ProjectFacts + UserPreferences
3. Pipeline generates 4x, filters, reranks, returns top N
4. User provides feedback (2-click UI)
5. Feedback informs quality metrics and future improvements

---

## Database Schema

### StylePolicy

```prisma
model StylePolicy {
  id              String   @id @default(cuid())
  language        String   // "en", "es", "ru"
  scope           String   @default("global") // "global", "platform:tiktok", "region:uk"
  status          String   @default("beta") // "stable", "beta"

  // Word/phrase limits
  wordLimits      Json     // See structure below

  // Patterns (exact matches)
  bannedPhrases   String[]

  // Patterns (regex for variations)
  bannedRegex     String[]

  // Soft warnings (not hard blocks)
  softAvoid       String[]

  // Tone guardrails
  harshWords      String[]

  // Versioning
  schemaVersion   Int      @default(1)

  @@unique([language, scope])
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

**wordLimits structure:**
```json
{
  "just": { "max": 1, "enforce": true },
  "literally": { "max": 0, "enforce": true },
  "exclamations": { "max": 2, "enforce": true },
  "ellipsis": { "max": 1, "enforce": false }
}
```

### ProjectFacts

```prisma
model ProjectFacts {
  id                 String   @id @default(cuid())
  projectId          String   @unique
  project            Project  @relation(fields: [projectId], references: [id])

  // Verified product information (anti-hallucination)
  features           Json     // Structured feature list
  workflowSteps      Json     // Correct order of operations
  ctaTemplates       Json     // Approved CTA patterns

  // Constraints
  minTimeClaim       Int?     // Minimum seconds for time claims (e.g., 30)

  // Anti-hallucination flags
  noInventedPromos   Boolean  @default(true)
  noInventedFeatures Boolean  @default(true)

  // Versioning
  schemaVersion      Int      @default(1)

  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
}
```

**features structure:**
```json
[
  {
    "id": "bg-removal",
    "canonical": "AI removes backgrounds automatically",
    "synonyms": ["background removal", "bg removal", "remove background"],
    "mustMention": false
  },
  {
    "id": "templates",
    "canonical": "100+ professional templates",
    "synonyms": ["templates", "designs", "layouts"],
    "mustMention": true
  }
]
```

**workflowSteps structure:**
```json
[
  { "step": "Choose a template", "position": 1, "required": true },
  { "step": "Upload your photo", "position": 2, "required": true },
  { "step": "Customize colors/text", "position": 3, "required": false },
  { "step": "Export and download", "position": 4, "required": true }
]
```

**ctaTemplates structure:**
```json
[
  { "template": "Try {product} free", "vars": ["product"] },
  { "template": "Link in bio", "vars": [] },
  { "template": "Get started at {url}", "vars": ["url"] }
]
```

### UserPreferences (MVP: minimal)

```prisma
model UserPreferences {
  id                  String   @id @default(cuid())
  userId              String   @unique
  user                User     @relation(fields: [userId], references: [id])

  // Personal banned phrases (account-wide)
  bannedPhrases       String[]

  // Defaults
  defaultPlatform     String?
  defaultDurations    Int[]

  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
}
```

### ScriptOutcome (Feedback)

```prisma
enum ScriptIssueCode {
  CLICHE
  UNNATURAL
  HALLUCINATION
  WRONG_ORDER
  WEAK_HOOK
  TOO_SALESY
  WRONG_TONE
  MADE_UP_DETAILS
}

model ScriptOutcome {
  id          String            @id @default(cuid())
  scriptId    String
  script      Script            @relation(fields: [scriptId], references: [id])
  userId      String
  projectId   String
  language    String

  // What user did with the script
  action      String            // "used_as_is", "edited", "discarded"

  // Structured issues (enum codes only)
  issues      ScriptIssueCode[]

  createdAt   DateTime          @default(now())

  @@index([language, createdAt])
  @@index([projectId, createdAt])
}
```

---

## StylePolicy: English Patterns

### Seed Data for English (Stable)

```typescript
const englishPolicy: StylePolicyCreate = {
  language: "en",
  scope: "global",
  status: "stable",

  wordLimits: {
    "just": { max: 1, enforce: true },
    "literally": { max: 0, enforce: true },
    "exclamations": { max: 2, enforce: true },
    "ellipsis": { max: 1, enforce: false },
    "caps_words": { max: 2, enforce: false }, // ALL CAPS words
  },

  // Exact match phrases (meme clichés)
  bannedPhrases: [
    "game changer",
    "game-changer",
    "life changing",
    "life-changing",
    "you need to see this",
    "wait for it",
    "trust me on this",
    "I said what I said",
    "and I'm not even kidding",
    "let that sink in",
    "read that again",
    "this is not a drill",
  ],

  // Regex patterns (structural clichés)
  bannedRegex: [
    // "Not A, not B, just C" variations
    "not\\s+\\w+[,.]?\\s*not\\s+\\w+[,.]?\\s*(just|only)\\s+\\w+",
    // "No X, no Y, just results"
    "no\\s+\\w+[,.]?\\s*no\\s+\\w+[,.]?\\s*(just|only)",
    // "literally X seconds/minutes"
    "literally\\s+\\d+\\s*(seconds?|minutes?|hours?)",
    // "in just X seconds"
    "in\\s+just\\s+\\d+\\s*(seconds?|minutes?)",
    // "X in just Y" time claims
    "\\w+\\s+in\\s+just\\s+\\d+",
    // Made-up promos
    "first\\s+\\d+\\s+(free|users?|customers?)",
    "\\d+%\\s*off",
    "promo\\s*code",
    "no\\s+credit\\s+card\\s+(needed|required)",
  ],

  // Soft warnings (not hard blocks)
  softAvoid: [
    "starting sentences with 'So...'",
    "excessive rhetorical questions",
    "more than one 'you guys' or 'y'all'",
    "'Right?' at end of sentences",
  ],

  // Harsh tone words
  harshWords: [
    "terrible",
    "ugly",
    "horrible",
    "crappy",
    "garbage",
    "trash",
    "worst",
    "pathetic",
    "disgusting",
    "awful",
  ],

  schemaVersion: 1,
};
```

### Regex Pattern Details

| Pattern | Matches | Purpose |
|---------|---------|---------|
| `not\s+\w+[,.]?\s*not\s+\w+[,.]?\s*(just\|only)\s+\w+` | "Not hard, not complicated, just simple" | Block "Not A, not B, just C" |
| `literally\s+\d+\s*(seconds?\|minutes?)` | "literally 10 seconds" | Block unrealistic time claims |
| `first\s+\d+\s+(free\|users?)` | "first 100 users free" | Block made-up promos |
| `\d+%\s*off` | "50% off" | Block unauthorized discounts |

---

## Pipeline: Generate → Filter → Rerank

### Batch Limits & Dynamic Scaling

**User Input:**
- `scriptsPerAngle`: Number of scripts to generate per selected angle
- `angles`: Array of selected angles
- `totalRequested = scriptsPerAngle × angles.length`

**Hard Limits:**
| Limit | Value | Reason |
|-------|-------|--------|
| Max total per batch | 30 | Cost control, quality |
| Min hooks | 6 | Need variety |
| Max hooks | 50 | Diminishing returns |
| Min scripts to generate | 3 | Need comparison pool |
| Max scripts to generate | 40 | Cost control |

**Dynamic Overgeneration Formula:**
```typescript
// Tier-based overgeneration ratios
const OVERGEN_RATIOS = {
  standard: { scripts: 1.3, hooks: 1.5 },  // ~2x total
  premium: { scripts: 1.6, hooks: 1.5 },   // ~2.4x total
};

function calculateOvergeneration(totalRequested: number, quality: 'standard' | 'premium') {
  const ratio = OVERGEN_RATIOS[quality];

  return {
    hooksToGenerate: clamp(Math.ceil(totalRequested * ratio.scripts * ratio.hooks), 6, 50),
    scriptsToGenerate: clamp(Math.ceil(totalRequested * ratio.scripts), 3, 40),
  };
}
```

**Examples:**
| Requested | Tier | Hooks | Scripts | Final |
|-----------|------|-------|---------|-------|
| 3 | standard | 6 | 4 | 3 |
| 5 | standard | 10 | 7 | 5 |
| 10 | standard | 20 | 13 | 10 |
| 5 | premium | 12 | 8 | 5 |
| 10 | premium | 24 | 16 | 10 |
| 30 | premium | 50 (cap) | 40 (cap) | 30 |

### UI Validation

```
Scripts per Angle: [___]
Helper text: "Max 30 scripts total across all angles"

If (scriptsPerAngle × angles.length) > 30:
  → Show error: "Exceeds limit of 30. Reduce scripts or select fewer angles."
  → Disable Generate button
```

### MVP Pipeline Flow

```
User requests N scripts (scriptsPerAngle × angles)
         ↓
    Validate: N ≤ 30
         ↓
    Calculate overgeneration counts
         ↓
┌─────────────────────────────────────────────┐
│  STEP 1: GENERATE HOOKS                     │
│  • Generate hooksToGenerate hook ideas      │
│  • Include banned patterns in prompt        │
│  • ~500-1500 tokens                         │
└─────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────┐
│  STEP 2: FILTER & SCORE HOOKS               │
│  • Apply StylePolicy to each hook           │
│  • Score by hook strength                   │
│  • Select top scriptsToGenerate hooks       │
└─────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────┐
│  STEP 3: GENERATE FULL SCRIPTS              │
│  • scriptsToGenerate parallel generations   │
│  • Each uses one selected hook              │
│  • Distribute across angles/durations       │
└─────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────┐
│  STEP 4: HARD FILTER SCRIPTS                │
│  • Reject scripts failing StylePolicy       │
│  • bannedPhrases, bannedRegex, wordLimits   │
│  • harshWords check                         │
└─────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────┐
│  STEP 5: RERANK                             │
│  • Score: specificity (30%) + novelty (25%) │
│           + audienceFit (25%)               │
│           + hookStrength (20%)              │
│  • Sort by score descending                 │
│  • Return top N requested                   │
└─────────────────────────────────────────────┘
```

### Token/Cost Estimate (with Gemini 3 models)

**Standard Tier (Gemini 3 Flash):**

| Step | Tokens (in/out) | Cost |
|------|-----------------|------|
| Hook generation (20) | ~700 / ~1200 | $0.004 |
| Script generation (8x) | ~4000 / ~5000 | $0.017 |
| **Total per batch (5 scripts)** | ~4700 / ~6200 | **~$0.021** |
| **Cost per script** | - | **~$0.004** |

**Premium Tier (Gemini 3 Pro):**

| Step | Tokens (in/out) | Cost |
|------|-----------------|------|
| Hook generation (20) | ~700 / ~2400 | $0.030 |
| Script generation (8x) | ~4000 / ~9000 | $0.116 |
| **Total per batch (5 scripts)** | ~4700 / ~11400 | **~$0.146** |
| **Cost per script** | - | **~$0.029** |

**Comparison with current system:**

| Tier | Current (direct) | New (pipeline) | Quality Gain |
|------|------------------|----------------|--------------|
| Standard (was Haiku) | ~$0.009/script | ~$0.004/script | +10 points, -55% cost |
| Premium (was Sonnet) | ~$0.023/script | ~$0.029/script | +39 points, +26% cost |

The premium tier costs slightly more but delivers significantly better quality (88/100 vs 49/100).

### Filter Implementation

```typescript
interface FilterResult {
  passed: boolean;
  reasons: string[]; // Why it was rejected
}

function filterScript(
  script: GeneratedScript,
  policy: StylePolicy,
  facts: ProjectFacts,
): FilterResult {
  const reasons: string[] = [];
  const text = extractAllText(script);
  const textLower = text.toLowerCase();

  // 1. Banned phrases (exact match)
  for (const phrase of policy.bannedPhrases) {
    if (textLower.includes(phrase.toLowerCase())) {
      reasons.push(`banned_phrase:${phrase}`);
    }
  }

  // 2. Banned regex
  for (const pattern of policy.bannedRegex) {
    const regex = new RegExp(pattern, 'gi');
    if (regex.test(text)) {
      reasons.push(`banned_pattern:${pattern.slice(0, 30)}`);
    }
  }

  // 3. Word limits (enforced only)
  for (const [word, config] of Object.entries(policy.wordLimits)) {
    if (!config.enforce) continue;

    const count = countOccurrences(text, word);
    if (count > config.max) {
      reasons.push(`word_limit:${word}:${count}>${config.max}`);
    }
  }

  // 4. Harsh words
  for (const word of policy.harshWords) {
    if (textLower.includes(word)) {
      reasons.push(`harsh_word:${word}`);
    }
  }

  // 5. Hallucination check
  const hallucinations = detectHallucinations(script, facts);
  reasons.push(...hallucinations.map(h => `hallucination:${h}`));

  return {
    passed: reasons.length === 0,
    reasons,
  };
}

function countOccurrences(text: string, word: string): number {
  if (word === 'exclamations') {
    return (text.match(/!/g) || []).length;
  }
  if (word === 'ellipsis') {
    return (text.match(/\.{3}/g) || []).length;
  }
  if (word === 'caps_words') {
    return (text.match(/\b[A-Z]{2,}\b/g) || []).length;
  }
  // Regular word
  const regex = new RegExp(`\\b${word}\\b`, 'gi');
  return (text.match(regex) || []).length;
}
```

---

## Scoring System

### Score Components

```typescript
interface RerankScores {
  specificity: number;   // 0-100: How much it uses actual product facts
  novelty: number;       // 0-100: How non-generic/non-cliché it is
  audienceFit: number;   // 0-100: How well it addresses persona pain/desires
  hookStrength: number;  // 0-100: Hook quality (pattern, length, trigger)
}

const WEIGHTS = {
  specificity: 0.30,
  novelty: 0.25,
  audienceFit: 0.25,
  hookStrength: 0.20,
};
```

### Specificity Score (0-100)

Measures how much the script uses actual product facts vs generic language.

```typescript
function scoreSpecificity(script: GeneratedScript, facts: ProjectFacts): number {
  const text = extractAllText(script).toLowerCase();
  let score = 0;

  // Check feature mentions
  const features = facts.features as Feature[];
  let mentionedCount = 0;
  let mustMentionCount = 0;
  let mustMentionHit = 0;

  for (const feature of features) {
    const mentioned = featureIsMentioned(text, feature);
    if (mentioned) mentionedCount++;
    if (feature.mustMention) {
      mustMentionCount++;
      if (mentioned) mustMentionHit++;
    }
  }

  // Base score: % of features mentioned (0-50)
  if (features.length > 0) {
    score += (mentionedCount / features.length) * 50;
  }

  // Bonus: all must-mention features included (0-30)
  if (mustMentionCount > 0) {
    score += (mustMentionHit / mustMentionCount) * 30;
  }

  // Bonus: workflow order correct (0-20)
  if (workflowOrderCorrect(script, facts.workflowSteps)) {
    score += 20;
  }

  return Math.min(100, Math.round(score));
}

function featureIsMentioned(text: string, feature: Feature): boolean {
  // Check canonical phrase
  if (text.includes(feature.canonical.toLowerCase())) return true;
  // Check synonyms
  for (const syn of feature.synonyms) {
    if (text.includes(syn.toLowerCase())) return true;
  }
  return false;
}
```

### Novelty Score (0-100)

Measures how non-generic the script sounds.

```typescript
function scoreNovelty(script: GeneratedScript, policy: StylePolicy): number {
  const text = extractAllText(script);
  let score = 100;

  // Deduct for soft-avoid patterns (not banned, but discouraged)
  for (const pattern of policy.softAvoid) {
    if (matchesSoftPattern(text, pattern)) {
      score -= 10;
    }
  }

  // Deduct for generic phrases (separate list)
  const genericPhrases = [
    "you won't believe",
    "here's why",
    "here's how",
    "the thing is",
    "real talk",
    "no cap",
    "it's giving",
  ];

  for (const phrase of genericPhrases) {
    if (text.toLowerCase().includes(phrase)) {
      score -= 8;
    }
  }

  // Deduct for excessive "you" addressing (more than 5 = pushy)
  const youCount = (text.match(/\byou\b/gi) || []).length;
  if (youCount > 5) {
    score -= (youCount - 5) * 3;
  }

  return Math.max(0, score);
}
```

### Audience Fit Score (0-100)

Measures how well the script addresses persona pain points and desires.

```typescript
function scoreAudienceFit(
  script: GeneratedScript,
  personas: Persona[],
): number {
  const text = extractAllText(script).toLowerCase();
  let score = 0;

  // Collect all pain points and desires
  const painPoints = personas.flatMap(p => p.painPoints);
  const desires = personas.flatMap(p => p.desires);

  // Score pain point mentions (0-50)
  let painHits = 0;
  for (const pain of painPoints) {
    if (textContainsKeywords(text, pain)) {
      painHits++;
    }
  }
  if (painPoints.length > 0) {
    score += Math.min(50, (painHits / Math.min(painPoints.length, 5)) * 50);
  }

  // Score desire mentions (0-50)
  let desireHits = 0;
  for (const desire of desires) {
    if (textContainsKeywords(text, desire)) {
      desireHits++;
    }
  }
  if (desires.length > 0) {
    score += Math.min(50, (desireHits / Math.min(desires.length, 5)) * 50);
  }

  return Math.round(score);
}

function textContainsKeywords(text: string, phrase: string): boolean {
  // Extract significant words from phrase
  const keywords = phrase.toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 3);

  // At least 50% of keywords should be present
  const hits = keywords.filter(kw => text.includes(kw)).length;
  return hits >= keywords.length * 0.5;
}
```

### Hook Strength Score (0-100)

```typescript
function scoreHookStrength(hook: string, facts: ProjectFacts): number {
  let score = 0;

  // 1. Length check: 6-14 words optimal (0-20)
  const wordCount = hook.split(/\s+/).length;
  if (wordCount >= 6 && wordCount <= 14) {
    score += 20;
  } else if (wordCount >= 4 && wordCount <= 18) {
    score += 10;
  }

  // 2. Contains question (0-15)
  if (hook.includes('?')) {
    score += 15;
  }

  // 3. Direct address "you/your" (0-15)
  if (/\byou\b|\byour\b/i.test(hook)) {
    score += 15;
  }

  // 4. Contains number/specificity (0-15)
  if (/\d+/.test(hook)) {
    score += 15;
  }

  // 5. Contains product-specific trigger (0-20)
  const features = facts.features as Feature[];
  for (const feature of features) {
    if (featureIsMentioned(hook.toLowerCase(), feature)) {
      score += 20;
      break;
    }
  }

  // 6. Power words present (0-15)
  const powerWords = [
    'stop', 'wait', 'secret', 'finally', 'never',
    'always', 'everyone', 'nobody', 'mistake', 'wrong',
  ];
  const hookLower = hook.toLowerCase();
  for (const word of powerWords) {
    if (hookLower.includes(word)) {
      score += 15;
      break;
    }
  }

  return Math.min(100, score);
}
```

### Final Score Calculation

```typescript
function calculateFinalScore(
  script: GeneratedScript,
  policy: StylePolicy,
  facts: ProjectFacts,
  personas: Persona[],
): number {
  const scores: RerankScores = {
    specificity: scoreSpecificity(script, facts),
    novelty: scoreNovelty(script, policy),
    audienceFit: scoreAudienceFit(script, personas),
    hookStrength: scoreHookStrength(script.hook, facts),
  };

  const final =
    scores.specificity * WEIGHTS.specificity +
    scores.novelty * WEIGHTS.novelty +
    scores.audienceFit * WEIGHTS.audienceFit +
    scores.hookStrength * WEIGHTS.hookStrength;

  return Math.round(final);
}
```

---

## Hallucination Detection

### Rule-Based Detection (No LLM Judge)

```typescript
interface HallucinationResult {
  detected: boolean;
  violations: string[];
}

function detectHallucinations(
  script: GeneratedScript,
  facts: ProjectFacts,
): string[] {
  const violations: string[] = [];
  const text = extractAllText(script);

  // 1. Check for invented promos
  if (facts.noInventedPromos) {
    const promoPatterns = [
      { pattern: /\d+%\s*off/gi, name: 'discount' },
      { pattern: /promo\s*code/gi, name: 'promo_code' },
      { pattern: /free\s*(trial|shipping|month|week)/gi, name: 'free_offer' },
      { pattern: /no\s+credit\s+card/gi, name: 'no_cc' },
      { pattern: /first\s+\d+\s+(free|users|customers)/gi, name: 'first_n_free' },
      { pattern: /limited\s+time\s+(only|offer)/gi, name: 'limited_time' },
      { pattern: /money.back\s+guarantee/gi, name: 'guarantee' },
    ];

    for (const { pattern, name } of promoPatterns) {
      if (pattern.test(text)) {
        violations.push(`invented_promo:${name}`);
      }
    }
  }

  // 2. Check for time claims below minimum
  if (facts.minTimeClaim) {
    const timeMatches = text.matchAll(/(\d+)\s*(seconds?|minutes?)/gi);
    for (const match of timeMatches) {
      const value = parseInt(match[1]);
      const unit = match[2].toLowerCase();
      const seconds = unit.startsWith('minute') ? value * 60 : value;

      if (seconds < facts.minTimeClaim) {
        violations.push(`time_claim_too_low:${value}${unit}<${facts.minTimeClaim}s`);
      }
    }
  }

  // 3. Check for invented features (if strict mode)
  if (facts.noInventedFeatures) {
    const features = facts.features as Feature[];
    const featureClaims = extractFeatureClaims(text);

    for (const claim of featureClaims) {
      const isKnown = features.some(f => featureIsMentioned(claim, f));
      if (!isKnown) {
        // Only flag if it looks like a feature claim
        if (looksLikeFeatureClaim(claim)) {
          violations.push(`unknown_feature:${claim.slice(0, 50)}`);
        }
      }
    }
  }

  return violations;
}

function looksLikeFeatureClaim(text: string): boolean {
  // Patterns that indicate a feature claim
  const claimIndicators = [
    /can\s+\w+/i,
    /will\s+\w+/i,
    /automatically\s+\w+/i,
    /instantly\s+\w+/i,
    /includes?\s+\w+/i,
    /features?\s+\w+/i,
    /comes\s+with/i,
  ];

  return claimIndicators.some(p => p.test(text));
}
```

---

## Feedback UI

### Design Principles

1. **2 clicks maximum** for basic feedback
2. **No required text input**
3. **Issue codes are enum, not free text**
4. **Optional deep-dive for power users**

### UI Mockup

```
┌─────────────────────────────────────────────────────────────┐
│  Script: "Stop scrolling if you're tired of..."            │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Did you use this script?                                   │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  ✓ Used     │  │  ✎ Edited   │  │  ✗ Skipped  │         │
│  │  as-is      │  │  it first   │  │  it         │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  [If Edited or Skipped, show issues:]                       │
│                                                             │
│  What was wrong? (select all that apply)                    │
│                                                             │
│  ☐ Too generic      ☐ Weak hook       ☐ Wrong order        │
│  ☐ Sounds fake      ☐ Too pushy       ☐ Made up stuff      │
│                                                             │
│                                        [Submit]             │
└─────────────────────────────────────────────────────────────┘
```

### Issue Code Mapping

| UI Label | Enum Code | Description |
|----------|-----------|-------------|
| Too generic | `CLICHE` | Script sounds like everyone else |
| Sounds fake | `UNNATURAL` | Not how real people talk |
| Made up stuff | `HALLUCINATION` | Invented features/promos |
| Wrong order | `WRONG_ORDER` | Workflow steps in wrong sequence |
| Weak hook | `WEAK_HOOK` | Hook doesn't grab attention |
| Too pushy | `TOO_SALESY` | Overly aggressive sales language |

### API Endpoint

```typescript
// POST /api/scripts/:id/outcome
interface CreateOutcomeDto {
  action: 'used_as_is' | 'edited' | 'discarded';
  issues?: ScriptIssueCode[];
}

// Response
interface OutcomeResponse {
  id: string;
  message: string;
}
```

---

## Quality Metrics

### Dashboard Query

```sql
-- Weekly quality metrics by language
SELECT
  language,
  DATE_TRUNC('week', created_at) as week,
  COUNT(*) as total_outcomes,

  -- Action distribution
  ROUND(100.0 * COUNT(*) FILTER (WHERE action = 'used_as_is') / COUNT(*), 1)
    as used_as_is_pct,
  ROUND(100.0 * COUNT(*) FILTER (WHERE action = 'edited') / COUNT(*), 1)
    as edited_pct,
  ROUND(100.0 * COUNT(*) FILTER (WHERE action = 'discarded') / COUNT(*), 1)
    as discarded_pct,

  -- Issue distribution
  ROUND(100.0 * COUNT(*) FILTER (WHERE 'CLICHE' = ANY(issues)) /
    NULLIF(COUNT(*) FILTER (WHERE action != 'used_as_is'), 0), 1)
    as cliche_pct,
  ROUND(100.0 * COUNT(*) FILTER (WHERE 'UNNATURAL' = ANY(issues)) /
    NULLIF(COUNT(*) FILTER (WHERE action != 'used_as_is'), 0), 1)
    as unnatural_pct,
  ROUND(100.0 * COUNT(*) FILTER (WHERE 'HALLUCINATION' = ANY(issues)) /
    NULLIF(COUNT(*) FILTER (WHERE action != 'used_as_is'), 0), 1)
    as hallucination_pct

FROM script_outcomes
WHERE created_at > NOW() - INTERVAL '90 days'
GROUP BY language, DATE_TRUNC('week', created_at)
ORDER BY week DESC, language;
```

### Success Criteria

| Metric | Target (MVP) | Target (Stable) |
|--------|--------------|-----------------|
| `used_as_is_pct` | > 25% | > 40% |
| `cliche_pct` | < 30% | < 15% |
| `unnatural_pct` | < 30% | < 15% |
| `hallucination_pct` | < 10% | < 5% |

### Language Promotion Criteria

Move language from "beta" to "stable" when (over 4 consecutive weeks):
- `used_as_is_pct` > 35%
- `cliche_pct` < 20%
- `unnatural_pct` < 15%
- `hallucination_pct` < 8%
- Volume > 100 scripts/week

---

## Implementation Phases

### Phase 1: Model Migration + StylePolicy + Hard Filters (Week 1)

**Deliverables:**
- [ ] **Model migration:**
  - [ ] Update script generation to use Gemini 3 Flash (standard) / Gemini 3 Pro (premium)
  - [ ] Update persona generation to use Gemini 3 Flash
  - [ ] Update URL analysis to use Gemini 3 Flash
  - [ ] Create centralized model config (`config/models.ts`)
- [ ] Database migration: `StylePolicy` model
- [ ] Seed English policy with patterns
- [ ] Filter service with hard rules
- [ ] Integration into generation pipeline (post-generation filter)
- [ ] Logging for filtered scripts (for debugging)

**Validation:**
- Run benchmark test again with new models to confirm quality
- Generate 100 scripts, verify filter catches expected patterns
- Compare "before filter" vs "after filter" samples

### Phase 2: Overgenerate + Rerank (Week 2)

**Deliverables:**
- [ ] Hook generation prompt (20 hooks)
- [ ] Hook scoring + selection (top 8)
- [ ] Parallel script generation
- [ ] Rerank scoring implementation
- [ ] Pipeline orchestration

**Validation:**
- A/B test: old pipeline vs new pipeline (internal)
- Measure score distributions

### Phase 3: ProjectFacts + Anti-Hallucination (Week 3)

**Deliverables:**
- [ ] Database migration: `ProjectFacts` model
- [ ] UI for editing ProjectFacts (features, workflow, CTAs)
- [ ] Hallucination detection integration
- [ ] Facts injection into prompts

**Validation:**
- Test with projects that have strict facts
- Verify hallucination detection catches invented promos

### Phase 4: Feedback UI + Tracking (Week 4)

**Deliverables:**
- [ ] Database migration: `ScriptOutcome` model
- [ ] Feedback UI component
- [ ] API endpoint for outcomes
- [ ] Quality metrics dashboard (admin)

**Validation:**
- Collect feedback from test users
- Verify metrics are being tracked correctly

### Phase 5: Reranker Tuning + Selection Quality (Week 5)

**Issues Identified (2026-02-03):**
- AudienceFit scores consistently 0-13 despite matching persona - needs calibration
- Weak hooks (HookStrength < 30) still making it through to final output
- Same product features repeated in every script (textured grip, hybrid D-pad, Xbox+PC+Mobile)
- Low-scoring scripts (Final < 40) should be rejected but aren't

**Deliverables:**
- [ ] **Minimum score thresholds:**
  - [ ] Add `MIN_HOOK_STRENGTH = 30` - reject hooks below this before script generation
  - [ ] Add `MIN_FINAL_SCORE = 40` - reject scripts below this from final output
  - [ ] If too few scripts pass, regenerate rather than return weak ones
- [ ] **AudienceFit scoring calibration:**
  - [ ] Current keyword matching is too strict - personas say "Hardcore Gamer" but scripts say "gamer"
  - [ ] Add fuzzy matching for persona keywords (stemming, synonyms)
  - [ ] Weight persona name/description matching, not just painPoints/desires arrays
  - [ ] Test with 5 different products to validate scores distribute 0-100
- [ ] **Feature variety enforcement:**
  - [ ] Track which features are mentioned across batch
  - [ ] Penalize scripts that only mention the same 3 features as others
  - [ ] Add diversity bonus in reranker for scripts covering different features
- [ ] **Hook diversity enforcement:**
  - [ ] Detect similar hooks (e.g., both start with "Struggling with...")
  - [ ] Add penalty for hooks too similar to others in same batch
  - [ ] Ensure selected hooks use different patterns/structures

**Validation:**
- Generate 3 batches of 7 scripts each, verify:
  - No script has HookStrength < 30
  - No script has Final < 40
  - AudienceFit scores spread across 20-80 range (not all 0-13)
  - At least 3 different product features mentioned across batch
  - No two hooks start with the same 3 words

### Phase 6: Iteration + Polish (Week 6+)

**Deliverables:**
- [ ] Tune regex patterns based on feedback
- [ ] Adjust scoring weights based on correlation analysis
- [ ] Add UserPreferences if needed
- [ ] Prepare non-EN policy templates

---

## Appendix: Prompt Modifications

### Hook Generation Prompt (Step 1)

```
You are generating hook ideas for a UGC video ad.

Product: {productDescription}
Target audience: {personaDescriptions}
Platform: {platform}
Angles to cover: {angles}

Generate 20 unique hook ideas. Each hook should:
- Be 6-14 words
- Grab attention in the first 2 seconds
- Address a specific pain point or desire
- NOT use these patterns: {bannedPhrasesList}

Return as JSON array:
["Hook 1", "Hook 2", ...]
```

### Script Generation Prompt (Step 3)

Add to existing prompt:

```
## Product Facts (USE THESE, do not invent)
Features:
{featuresList}

Workflow (CORRECT ORDER):
{workflowSteps}

## Restrictions
- Maximum 1 "just", 0 "literally"
- Maximum 2 exclamation marks
- Do NOT mention: discounts, promo codes, free trials (unless specified in Offer)
- Do NOT claim times faster than {minTimeClaim} seconds
- Use softer tone: "not quite right" instead of "terrible", "could be better" instead of "ugly"
```

---

## Open Questions

1. **Hook deduplication:** If 2 hooks are very similar, how to handle? (Current: let rerank handle it via novelty score)

2. **Caching:** Should we cache StylePolicy per request or load once at startup? (Recommend: cache with 5-min TTL)

3. **Feature extraction:** Should we auto-extract features from productDescription? (Recommend: MVP = manual, Phase 6 = auto)

4. **A/B testing infrastructure:** Do we need formal A/B for pipeline comparison? (Recommend: simple flag + metrics comparison first)

---

*Document created: 2025-01-30*
*Last updated: 2025-01-30*
