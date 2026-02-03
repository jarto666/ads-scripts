# UGC Script Generation System - Complete Technical Documentation

> **Purpose:** This document provides a comprehensive explanation of the entire script generation pipeline, including architecture, prompts, scoring algorithms, and quality checks. Use this for system review, debugging, or external analysis.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Pipeline Architecture](#2-pipeline-architecture)
3. [Prompts Reference](#3-prompts-reference)
4. [Scoring & Quality System](#4-scoring--quality-system)
5. [Style Filtering](#5-style-filtering)
6. [Configuration Constants](#6-configuration-constants)
7. [Data Models](#7-data-models)

---

## 1. System Overview

### What This System Does

This is an AI-powered UGC (User Generated Content) video ad script generator that creates scroll-stopping short-form video scripts for platforms like TikTok, Instagram Reels, and YouTube Shorts.

### Core Technology Stack

- **Backend:** NestJS (Node.js)
- **LLM Provider:** Google Gemini (via OpenRouter)
- **Queue System:** BullMQ (Redis-backed)
- **Database:** PostgreSQL with Prisma ORM
- **Real-time:** WebSocket notifications

### Key Concepts

| Concept | Description |
|---------|-------------|
| **Batch** | A generation request (e.g., "generate 8 scripts") |
| **Script** | A complete video ad script with hook, storyboard, CTAs |
| **Hook** | The opening line designed to stop scrolling |
| **Angle** | The marketing approach (pain agitation, social proof, etc.) |
| **Persona** | Target audience profile with pain points and desires |
| **Overgeneration** | Generate more than needed, filter to best ones |

---

## 2. Pipeline Architecture

### High-Level Flow

```
User Request (N scripts)
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  BATCH CREATION                                             │
│  • Validate credits                                         │
│  • Create batch record (status: pending)                    │
│  • Consume credits immediately                              │
│  • Queue job for processing                                 │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 1: HOOK GENERATION                                    │
│  • Generate 50% more hooks than needed per angle            │
│  • Apply style filter to each hook                          │
│  • Score hook strength (0-100)                              │
│  • Stratified selection: top hooks per angle                │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 2: SCRIPT GENERATION (Parallel, 4 concurrent)         │
│  • For each selected hook:                                  │
│    - Build prompt with exact hook                           │
│    - Generate full script via LLM                           │
│    - Parse JSON (retry/repair if needed)                    │
│  • Emit progress via WebSocket                              │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 3: SOFT FILTERING                                     │
│  • Check StylePolicy violations                             │
│  • Scripts with violations: KEPT but flagged                │
│  • No scripts discarded (users paid for them)               │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 4: RERANKING                                          │
│  • Score 4 dimensions (specificity, novelty, fit, hook)     │
│  • Apply filter penalty (-25) for violations                │
│  • Apply diversity penalty for same hook openers            │
│  • Sort by final score descending                           │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 5: QUALITY VALIDATION                                 │
│  • Calculate filmability score (0-100)                      │
│  • Validate beat count for duration                         │
│  • Generate user-facing warnings                            │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 6: DELIVERY                                           │
│  • Select top N scripts (requestedCount)                    │
│  • Save to database with analytics data                     │
│  • Mark batch complete                                      │
│  • Emit completion WebSocket                                │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
    User Receives Scripts
```

### Concurrency Model

| Level | Concurrency | Description |
|-------|-------------|-------------|
| Queue (Standard) | 2 batches | Max 2 batches processing simultaneously |
| Queue (Pro) | 3 batches | Pro users get priority queue |
| Script Generation | 4 parallel | Per batch, max 4 LLM calls at once |

### Timing Example (8 scripts)

```
0s     - Batch created, queued
1-4s   - Hook generation (LLM call)
4-5s   - Hook filtering & selection
5-12s  - Script generation (4 parallel, ~2-3 per script)
12-13s - Filtering, reranking, scoring
13-14s - Database save
14s    - Batch complete
```

---

## 3. Prompts Reference

### 3.1 Hook Generation Prompt

**Purpose:** Generate multiple hook variations per angle for selection

**File:** `apps/api/src/generation/prompt-builder.ts`

```
You are an expert UGC hook writer specializing in scroll-stopping opening lines.

## Platform: [PLATFORM]
[Platform-specific guidance: pacing, hook style, caption density, edit notes, CTA style, tone]

## Product
[Product description]
[Offer if present]

## Target Audiences
[For each persona: name, description, pain points]

## VOICE & TONE (CRITICAL)
Write as if the creator is talking to a friend, NOT reading ad copy.
- Use contractions: "don't", "can't", "I'm", "you're"
- Vary your opening structures - NEVER start two hooks the same way
- Match the audience's vocabulary
- AVOID marketing speak: "experience", "seamless", "elevate", "leverage", "transform"

## Task
Generate EXACTLY [hooksPerAngle] hooks for EACH of the following angles.
Total hooks: [anglesCount] angles × [hooksPerAngle] = [totalHooks]

[For each angle: label, hookGuidance, examples]

## Hook Requirements
- Each hook must be 6-14 words
- Must grab attention in the first 2 seconds
- Should address a specific pain point, desire, or curiosity gap
- CRITICAL: Each hook must start differently. No repeated first words.

## BANNED HOOK PATTERNS (overused - avoid)
- "Here's the thing..." / "Here's why..."
- "I kept seeing this..." / "Everyone's been asking..."
- "POV: You finally..."
- "Nobody talks about..."
- "Game changer" / "Life changer"
- Starting with "So..." without context
- Generic "This changed everything"
- Starting with "Okay" or "Okay,"

## STRONG HOOK PATTERNS (prefer these)
- Specific numbers: "I cut my editing time from 3 hours to 20 minutes"
- Unexpected contrast: "I spent $2000 on courses. This $30 tool worked better."
- Direct challenge: "Your hooks are boring. Here's proof."
- Confession format: "I've been lying to you about..."
- Mid-action start: "Wait wait wait - did that just work?"

Return as JSON object with angle keys:
{
  "[angle1]": ["hook1", "hook2", ...],
  "[angle2]": ["hook1", "hook2", ...]
}
```

**LLM Settings:**
- Model: `google/gemini-3-flash-preview`
- Temperature: 0.9 (high creativity)
- Max Tokens: 2048

---

### 3.2 Script Generation Prompt (From Hook)

**Purpose:** Expand a selected hook into a full script

**File:** `apps/api/src/generation/script-generator.service.ts`

```
You are an expert UGC video ad script writer.

## Product
[Product description]
[Offer if present]

## Language
[Language instruction if non-English]

## Target Audience
[Persona names and descriptions]

## Brand Voice
[Brand voice if defined]

## Forbidden Claims
[List of claims to never use]

## Task
Write a complete PAID AD script using this EXACT hook:
"[SELECTED_HOOK]"

Angle: [angle]
Duration: [duration]s
Platform: [platform]

Return this EXACT JSON structure:
{
  "angle": "[angle]",
  "duration": [duration],
  "hook": "[exact hook - do not modify]",
  "storyboard": [
    {
      "t": "0-3s",
      "shot": "What is in frame and the action",
      "onScreen": "Text overlay for this segment",
      "spoken": "Exact words the creator says",
      "broll": ["B-roll idea 1", "B-roll idea 2"]
    }
  ],
  "ctaVariants": ["CTA option 1", "CTA option 2", "CTA option 3"],
  "filmingChecklist": ["Filming instruction 1", "Props needed"],
  "warnings": []
}

REQUIREMENTS:
- Use the EXACT hook provided (do not modify it)
- Storyboard should have [min]-[max] segments for [duration]s
- Time segments should add up to ~[duration]s
- CTAs should match platform style
```

**LLM Settings:**
- Model: Based on quality tier (Flash for standard, Pro for premium)
- Temperature: 0.7
- Max Tokens: 4096

---

### 3.3 Script Regeneration Prompt

**Purpose:** Modify existing script based on user instructions

```
You are a UGC script writer. Modify the following script based on the instruction.

## Original Script
[Original storyboard as JSON]

Hook: [original hook]
CTAs: [original CTAs]

## Modification Instruction
[User's instruction - what to change]

## Product Context
[Product description]

Return the modified script in the same JSON format:
{
  "angle": "[angle]",
  "duration": [duration],
  "hook": "...",
  "storyboard": [...],
  "ctaVariants": [...],
  "filmingChecklist": [...],
  "warnings": [...]
}
```

**LLM Settings:**
- Temperature: 0.5 (more focused)
- Retries: 3 with exponential backoff

---

### 3.4 Platform-Specific Guidance

Each prompt includes platform-specific instructions:

**TikTok:**
```
- Pacing: Very fast, aggressive pattern interrupts, high energy throughout
- Hook Style: Bold first-frame stop-scroll, comment/objection framing, conversational
- Caption Density: High - punchy text overlays on most beats, bold keywords
- Edit Notes: Jump cuts every 1-2s, handheld/phone-native feel, chaotic energy OK
- CTA Style: Direct and urgent ("Get yours", "Try it now", "Link in bio")
- Tone: Raw, unpolished, native creator energy - like talking to a friend
- Conversational Style: Ultra-casual. Slang OK. Trending phrases OK.
```

**Instagram Reels:**
```
- Pacing: Fast but cleaner, less chaotic than TikTok
- Hook Style: Relatable setup + aesthetic proof, polished UGC vibe, lifestyle-oriented
- Caption Density: Medium-high - clean, readable overlays with good typography
- Edit Notes: Smoother transitions, better lighting, Instagram-aesthetic
- CTA Style: Softer, brand-safe ("Learn more", "Shop the link")
- Tone: Elevated UGC, aspirational but authentic
- Conversational Style: Casual but polished. Less slang. Relatable but aspirational.
```

**YouTube Shorts:**
```
- Pacing: Fast but clarity-first, structured delivery
- Hook Style: Clear promise + "here's how/why" framing, educational angle
- Caption Density: Medium - fewer noisy overlays, cleaner text
- Edit Notes: Voiceover-friendly, structured beats, tutorial-adjacent
- CTA Style: Straightforward ("Check the link", "See description")
- Tone: Informative creator, less slang, more substance
- Conversational Style: Informative casual. More 'helpful friend' than 'cool friend'.
```

---

### 3.5 Angle-Specific Structure Guidance

Each angle has specific structure guidance:

**Pain Agitation:**
```
Structure: (1) Hook with intense pain point, (2) Agitate by showing consequences,
(3) Brief product intro as relief, (4) Show the relief working, (5) CTA.
Keep 60% of script on pain/agitation before introducing solution.
Visual: The frustration must be VISIBLE - facial expressions, body language.
```

**Social Proof:**
```
Structure: (1) Hook referencing what others are doing, (2) Show evidence of popularity,
(3) Explain why people love it, (4) Show yourself using it, (5) CTA.
Visual: Show EVIDENCE of others - comments, reviews, multiple people.
```

**Before/After:**
```
Structure: (1) Hook showing "before" state, (2) Dwell on how bad "before" was,
(3) Introduce product as turning point, (4) Show dramatic "after", (5) CTA.
Visual: The contrast must be OBVIOUS at a glance - split-screen, side-by-side.
```

**Curiosity Hook:**
```
Structure: (1) Hook with incomplete statement, (2) Build suspense,
(3) Reveal insight gradually, (4) Connect to product, (5) CTA.
Visual: Visually TEASE without revealing. Hide, blur, delay the payoff.
```

**Problem/Solution:**
```
Structure: (1) Hook naming specific problem, (2) Validate the problem,
(3) Introduce solution directly, (4) Show how it works, (5) CTA.
Visual: Show problem in context, then show solution working.
```

**Objection Reversal:**
```
Structure: (1) Hook stating objection you had, (2) Explain why you thought that,
(3) Reveal what changed your mind, (4) Show proof, (5) CTA.
Visual: Body language should reflect the shift from doubt to belief.
```

**Urgency/Scarcity:**
```
Structure: (1) Hook with urgency element, (2) Explain why limited,
(3) Quick product value prop, (4) Reinforce urgency, (5) Urgent CTA.
Visual: Energy should feel RUSHED - fast pacing, grabbing motions.
```

**Transformation:**
```
Structure: (1) Hook with transformation claim, (2) Brief "where I started",
(3) The journey with product, (4) The result, (5) Reflection, (6) CTA.
Visual: Show the JOURNEY, not just result. Progress markers, time passing.
```

---

## 4. Scoring & Quality System

### 4.1 Reranking Scores (Determines Script Selection Order)

The reranking system scores scripts on 4 dimensions to determine which scripts are best:

**Dimension Weights (sum = 100%):**
```
Specificity:   30%
Novelty:       25%
Audience Fit:  25%
Hook Strength: 20%
```

**Final Score Formula:**
```
finalScore = round(
  specificity × 0.30 +
  novelty × 0.25 +
  audienceFit × 0.25 +
  hookStrength × 0.20
)
```

---

#### 4.1.1 Specificity Score (0-100)

**Purpose:** Measures how much the script uses actual product details vs generic language

**Algorithm:**
1. Extract keywords from product description (words >3 chars, excluding stop words)
2. Count keyword matches in script text
3. Calculate: `matchRatio = matchCount / min(keywordCount, 10)`
4. Base score: `round(matchRatio × 60)` → 0-60 points

**Bonuses:**
- Product name mentioned: **+20 points**
- Specific numbers from product appear in script: **+10 points**

**Stop Words Excluded (43 words):**
```
the, a, an, and, or, but, in, on, at, to, for, of, with, by, from, is, are,
was, were, be, been, being, have, has, had, do, does, did, will, would, could,
should, may, might, must, shall, can, need, that, this, these, those, it, its,
they, them, their, we, us, our, you, your, i, me, my, he, she, him, her, his,
who, what, where, when, why, how, all, each, every, both, few, more, most,
other, some, such, no, not, only, same, so, than, too, very, just, also, now
```

---

#### 4.1.2 Novelty Score (0-100)

**Purpose:** Measures how fresh/non-generic the script sounds

**Starting Score:** 100 (deduct for issues)

**Generic Phrases (-12 points each):**
```
"you won't believe"
"here's why"
"here's how"
"the thing is"
"real talk"
"no cap"
"it's giving"
"this changed my life"
"you need this"
"best thing ever"
"so amazing"
"absolutely love"
"obsessed with"
```

**Soft Avoid Patterns (-8 points each):**
| Pattern | Regex | Description |
|---------|-------|-------------|
| starts with So | `/(?:^|\.\s+)so\s/i` | Sentences starting with "So..." |
| excessive questions | `/\?.*\?.*\?/g` | 3+ question marks |
| repeated you guys | `/\byou guys\b.*\byou guys\b/i` | Multiple "you guys" |
| ends with Right? | `/right\?\s*$/i` | Ending with "Right?" |
| starts with Okay so | `/^okay so\b/i` | Opening with "Okay so" |

**Dynamic Penalties:**
- "you" appears >6 times: **-4 per excess**
- ALL CAPS words >2: **-5 per excess word**
- Exclamation marks >3: **-5 per excess**

---

#### 4.1.3 Audience Fit Score (0-100)

**Purpose:** How well script addresses persona pain points and desires

**Components:**

**A. Persona Context Bonus (0-20 points):**
- Persona name keywords in script: +5 per persona
- Persona description keywords (fuzzy match): +5 per persona

**B. Pain Points (0-40 points):**
- Fuzzy match pain points in script
- Target = min(painPoints.length, 5)
- Score = `min(40, round((hits / target) × 40))`

**C. Desires (0-40 points):**
- Fuzzy match desires in script
- Target = min(desires.length, 5)
- Score = `min(40, round((hits / target) × 40))`

**Fuzzy Matching:**
- Uses simple stemming (removing -ing, -ed, -er, -s, etc.)
- Requires 40% keyword overlap for a hit
- Stop words removed before matching

**Stemming Rules:**
```
-ing (word > 5 chars)  → remove
-ed (word > 4 chars)   → remove
-er (word > 4 chars)   → remove
-est (word > 5 chars)  → remove
-ness (word > 6 chars) → remove
-ment (word > 6 chars) → remove
-ly (word > 4 chars)   → remove
-ies (word > 4 chars)  → change to 'y'
-es (word > 4 chars)   → remove
-s (word > 3 chars, not ending 'ss') → remove
```

---

#### 4.1.4 Hook Strength Score (0-100)

**Purpose:** How engaging and scroll-stopping the hook is

**Cliché Penalty (-15 points, once):**
```
"here's the thing", "here's why", "here's how", "i kept seeing",
"everyone's been asking", "pov: you finally", "nobody talks about",
"stop scrolling if", "this changed everything", "game changer",
"life changer", "wait until you see", "you need to see this"
```

**Length Check (0-20 points):**
- 6-14 words: +20 (optimal)
- 4-18 words: +10

**Contains Question (+15 points):**
- If hook includes "?"

**Direct Address (+15 points):**
- If `/\byou\b|\byour\b/i` matches

**Number Specificity (+15 points):**
- If `/\d+/` matches

**Power Words (0-20 points):**
```
Score = min(20, powerWordCount × 7)

POWER_WORDS:
stop, wait, secret, finally, never, always, everyone,
nobody, mistake, wrong, actually, truth, real, honest
```

**Emotional/Curiosity Triggers (0-15 points, +5 per category):**
- Emotional: `tired|sick|frustrated|hate|love|obsessed|scared|stressed`
- Truth/real: `secret|hidden|truth|real|honest`
- Urgency: `stop|wait|don't|never|always`

---

### 4.2 Penalties Applied After Scoring

**Filter Penalty (-25 points):**
- Applied to scripts with style filter violations
- Script is kept but ranked lower

**Diversity Penalty (-8 × occurrence):**
- Prevents multiple scripts with same hook opener (first 3 words)
- 1st duplicate: -8, 2nd: -16, 3rd: -24, etc.

---

### 4.3 Filmability Score (User-Facing Quality Score)

**Purpose:** Overall quality score shown to users (0-100)

**Components:**

| Component | Weight | Max Points |
|-----------|--------|------------|
| Hook Strength | 20% | 20 |
| Clarity | 20% | 20 |
| Visuality | 20% | 20 |
| Compliance | 15% | 15 |
| Pacing | 10% | 10 |
| CTA Quality | 10% | 10 |
| Authenticity | 5% | 5 |

---

#### Hook Strength (0-20 points)

**Power Words (0-6 points):**
```
Score = min(6, powerWordCount × 2)

HOOK_POWER_WORDS (52 total):
stop, wait, hold on, pause, listen,
if you, if you're, when you, ever wonder,
but, however, actually, truth is, reality is,
don't, never, avoid, mistake, wrong,
secret, hidden, nobody tells, what if, imagine,
everyone, people are, went viral, obsessed,
bet you, prove me wrong, change my mind,
story time, storytime, true story, confession, finally,
works, changed, discovered, found, realized,
pov, pov:, me when, that moment when, when your,
scared, stressed, hate, tired of, sick of, struggling,
crazy, literally, lowkey, highkey, ngl, fr,
anyone else, tell me why, is it just me, not me
```

**Numbers/Metrics (0-4 points):**
- Contains any number: +2
- Contains specific metrics (%, $, x, time units): +2

**Question Hook (+3):** If "?" in hook

**Direct Address (+3):** If "you/your" in hook

**Length (0-4 points):**
- ≤8 words: +4
- ≤12 words: +3
- ≤15 words: +1

---

#### Clarity (0-20 points)

**Early Benefits (0-10 points):**
```
Check first 2 storyboard steps for BENEFIT_WORDS
Score = min(10, benefitCount × 2)

BENEFIT_WORDS:
get, achieve, unlock, gain, earn, win,
transform, change, become, turn into, upgrade,
easy, simple, quick, fast, instant, effortless,
finally, no more, goodbye, forget, stop struggling,
save, free, bonus, extra, included,
help, solve, fix, cure, heal, improve,
results, outcome, difference, impact, effect,
love, enjoy, amazing, incredible, perfect,
minutes, seconds, hours, days, weeks, overnight
```

**Problem-Solution Structure (0-5 points):**
- Has problem indicators: +1-3
- Has solution indicators: +1-3
- Both present: +5

**Complete Structure (0-5 points):**
- Hook + Body (≥3 segments) + CTA: +5

---

#### Visuality (0-20 points)

**Concrete Action Words (0-10 points):**
```
Score = round((concreteSteps / totalSteps) × 10)

VISUAL_ACTION_WORDS:
show, reveal, display, present, demonstrate,
hold, grab, pick up, put down, place, set,
open, close, pour, apply, use, try,
close-up, closeup, wide shot, medium shot,
pan, zoom, tilt, track, follow,
face, hands, eyes, smile, reaction, expression,
product, package, box, bottle, label, texture,
point, gesture, look at, focus on, highlight,
cut to, transition, switch, move to
```

**Shot Variety (0-4 points):**
- Based on unique shot descriptions

**B-Roll Suggestions (0-3 points):**
- ≥50% of steps have broll: +3
- >0 steps have broll: +1

**Step Count (0-3 points):**
- ≥5 steps: +3

---

#### Compliance (0-15 points)

**Default:** 15 points

**Deduction:** -5 per forbidden claim found

---

#### Pacing (0-10 points)

**Valid Timing Format (0-4 points):**
- Based on parseable "t" fields (e.g., "0-3s")

**Duration Match (0-6 points):**
- ≤10% difference: +6
- ≤20% difference: +4
- ≤30% difference: +2

---

#### CTA Quality (0-10 points)

**Multiple Options (0-3 points):**
- ≥3 variants: +3

**Action Words (0-4 points):**
```
CTA_ACTION_WORDS:
click, tap, get, grab, shop, buy, order,
try, start, join, sign up, subscribe, follow,
check out, discover, learn, see, find out,
claim, unlock, access, download, save
```

**Urgency Words (0-3 points):**
```
CTA_URGENCY_WORDS:
now, today, limited, exclusive, only, last chance,
hurry, fast, quick, before, while, ending,
don't miss, don't wait, act now, right now
```

---

#### Authenticity (0-5 points)

**Starting Score:** 5

**Corporate Speak Penalty (-1 each):**
```
CORPORATE_PHRASES:
leverage, synergy, optimize, utilize, facilitate,
comprehensive solution, cutting-edge, state-of-the-art,
industry-leading, best-in-class, world-class,
revolutionary, groundbreaking, game-changing,
paradigm shift, holistic approach, robust
```

**Conversational Markers Bonus (+up to 2):**
```
honestly, literally, actually, okay so, like,
you guys, y'all, real talk, no joke, trust me,
i mean, right?, you know
```

---

### 4.4 Automated Warnings

Generated when scores are low:

| Condition | Warning Message |
|-----------|-----------------|
| hookScore < 6 | "Hook could be stronger - try adding power words or a question" |
| clarityScore < 10 | "Benefits not clearly communicated early in the script" |
| visualityScore < 10 | "Storyboard needs more specific, actionable shot descriptions" |
| pacingScore < 5 | "Timing segments may not match target duration" |
| ctaScore < 5 | "CTAs could be more action-oriented or urgent" |
| storyboard < 3 | "Storyboard too short - needs more detail" |
| filmingChecklist = 0 | "Missing filming checklist" |
| filterViolations > 0 | "Script contains phrases that may need review before use" |

---

## 5. Style Filtering

### 5.1 Filter Types

| Type | Effect | Examples |
|------|--------|----------|
| **Banned Phrases** | Hard fail → Penalty | "guaranteed results", "100% effective" |
| **Banned Regex** | Hard fail → Penalty | Medical claims patterns |
| **Harsh Words** | Hard fail → Penalty | Profanity, offensive terms |
| **Word Limits** | Configurable | Max exclamations, caps words |
| **Soft Avoid** | Warning only | Overused patterns |

### 5.2 Word Limit Checks

Special counters:
```
"exclamations" → Count "!" characters
"ellipsis"     → Count "..." patterns
"caps_words"   → Count ALLCAPS words (/\b[A-Z]{2,}\b/g)
[other words]  → Word boundary match (/\b[word]\b/gi)
```

### 5.3 Soft Avoid Patterns

Detected but don't cause failure:

| Pattern Name | Detection |
|--------------|-----------|
| Starting with "So..." | Regex: `/(?:^|\.\s+)so\s/i` |
| Excessive questions | Count "?" > 3 |
| Multiple "you guys" | Regex + count > 1 |
| Ending with "Right?" | Regex: `/right\?\s*$/i` |
| Opening with "Okay so" | Regex: `/^okay so\b/i` |

### 5.4 Filter Results

```typescript
{
  passed: boolean,      // true if no hard violations
  violations: string[], // Hard failures (cause penalty)
  warnings: string[]    // Soft flags (informational)
}
```

**Note:** As of current implementation, scripts with violations are **kept but penalized** (-25 points in ranking). Users paid for them, so they receive them with warnings.

---

## 6. Configuration Constants

### 6.1 Quality Thresholds

```typescript
QUALITY_THRESHOLDS = {
  minHookStrength: 30,  // Minimum hook score for selection
  minFinalScore: 40,    // Minimum rerank score (logged, not filtered)
}
```

### 6.2 Batch Limits

```typescript
BATCH_LIMITS = {
  maxTotalScripts: 30,      // Max scripts per batch
  minHooksPerAngle: 5,
  maxHooksPerAngle: 40,
  minHooks: 6,
  maxHooks: 50,
  minScriptsToGenerate: 3,
  maxScriptsToGenerate: 40,
}
```

### 6.3 Overgeneration Ratios

**Standard Tier:**
```
scripts: 1.3× (generate 30% more than requested)
hooks:   1.5× (generate 50% more than requested)
```

**Premium Tier:**
```
scripts: 1.6× (generate 60% more than requested)
hooks:   1.5× (generate 50% more than requested)
```

### 6.4 Credit System

```
CREDIT_COST_PER_SCRIPT = 1
Batch of 8 scripts = 8 credits
Script regeneration = 1 credit
```

### 6.5 LLM Configuration

| Task | Model | Temperature | Max Tokens |
|------|-------|-------------|------------|
| Hook Generation | gemini-3-flash | 0.9 | 2048 |
| Script (Standard) | gemini-3-flash | 0.7 | 4096 |
| Script (Premium) | gemini-3-pro | 0.7 | 4096 |
| Regeneration | (batch quality) | 0.5 | 4096 |
| JSON Repair | (current model) | 0 | varies |

### 6.6 Retry Configuration

```
Script Generation: 3 attempts per script
Regeneration: 3 attempts with exponential backoff (2s, 4s, 8s)
JSON Repair: Called on parse failure
```

---

## 7. Data Models

### 7.1 Script Output Structure

```typescript
interface ScriptOutput {
  angle: string;          // e.g., "pain_agitation"
  duration: number;       // e.g., 15, 30, 60
  hook: string;           // Opening line
  storyboard: Array<{
    t: string;            // Timing, e.g., "0-3s"
    shot: string;         // Shot description
    onScreen: string;     // Text overlay
    spoken: string;       // Dialogue
    broll?: string[];     // B-roll suggestions
  }>;
  ctaVariants: string[];  // 3 CTA options
  filmingChecklist: string[];
  warnings?: string[];
  filterViolations?: string[];  // Style filter violations
}
```

### 7.2 Analytics Data (Stored Per Script)

```typescript
interface ScriptAnalytics {
  // Rerank scores
  specificity: number;    // 0-100
  novelty: number;        // 0-100
  audienceFit: number;    // 0-100
  hookStrength: number;   // 0-100
  finalScore: number;     // 0-100 weighted

  // Penalties applied
  penalties: {
    diversityPenalty: number;
    filterPenalty: number;
  };

  // Filter results
  filterViolations: string[];

  // Hook metadata
  hookMeta: {
    wordCount: number;
    hasQuestion: boolean;
    hasNumber: boolean;
    powerWordsFound: string[];
  };

  // Batch context
  batchPosition: number;   // Rank in batch (1 = best)
  totalGenerated: number;
  totalFiltered: number;

  scoredAt: string;        // ISO timestamp
}
```

### 7.3 Batch Structure

```typescript
interface Batch {
  id: string;
  projectId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  requestedCount: number;
  platform: string;
  angles: string[];
  durations: number[];
  personaIds: string[];
  quality: 'standard' | 'premium';
  pdfUrl?: string;
  csvUrl?: string;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Summary: Key Design Decisions

1. **Overgeneration Strategy:** Generate more hooks/scripts than needed, filter to best ones

2. **Soft Filtering:** Scripts with issues are kept but penalized, not discarded (users paid for them)

3. **Multi-Dimensional Scoring:** 4 rerank dimensions + 7 filmability dimensions provide comprehensive quality assessment

4. **Stratified Selection:** Hooks are selected per-angle to ensure balanced coverage

5. **Platform-Specific Prompts:** Each platform has distinct tone, pacing, and style guidelines

6. **Fuzzy Matching:** Persona pain points use stemming and lenient thresholds for better matching

7. **Diversity Enforcement:** Penalty system prevents repetitive hook patterns

8. **Credits on Request:** Credits consumed at batch creation, not on completion

---

*Last updated: 2026-02-03*
