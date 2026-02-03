# Quality System V2 - Implementation Plan

> **Goal:** Transform from "LLM wrapper" to "system that learns and improves"
> **Constraint:** Single quality tier, never reduce delivered script count
> **Based on:** GPT reviews + Opus analysis (Feb 2026)

---

## Executive Summary

### Core Problems Identified

| Problem | Impact | Root Cause |
|---------|--------|------------|
| **Hallucinations** | Agencies lose trust | No fact-grounding enforcement |
| **Low AudienceFit** | Scores don't reflect relevance | Missing persona painPoints/desires |
| **Inflated Novelty** | 97+ scores on generic content | Tiny cliché pattern list (13 items) |
| **Weak Hook Gate** | Everything passes threshold 30 | Checkbox-based scoring |
| **No Learning** | System doesn't improve | No feedback → rules pipeline |

### Solution Layers

```
┌─────────────────────────────────────────────────────────────┐
│  LAYER 1: GROUNDEDNESS (Stop Hallucinations)                │
│  • ProjectFacts as source of truth                          │
│  • Claim-to-fact validation                                 │
│  • Rewrite loop (never reject, always deliver)              │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  LAYER 2: SCORING CALIBRATION (Match Human Judgment)        │
│  • Fix AudienceFit via persona data                         │
│  • Expand cliché patterns (100+)                            │
│  • Grounded specificity (reward facts, not inventions)      │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  LAYER 3: LEARNING LOOP (Improve Over Time)                 │
│  • Feedback UI (👍/👎 + reasons)                            │
│  • Feedback → project rules                                 │
│  • Winners anchoring (few-shot examples)                    │
└─────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Groundedness (Week 1)

### 1.1 ProjectFacts Schema

**New Prisma model:**

```prisma
model ProjectFacts {
  id        String   @id @default(cuid())
  projectId String   @unique
  project   Project  @relation(fields: [projectId], references: [id])

  // Product grounding
  features        String[]  // Verified feature list
  workflowSteps   String[]  // Correct order of actions

  // Offer grounding
  pricing         String?   // Exact pricing info
  promos          String[]  // Allowed promos ONLY
  ctaRules        String[]  // Allowed CTAs

  // Proof grounding
  allowedProof    String[]  // Stats/testimonials we CAN use

  // Constraints
  forbiddenClaims String[]  // Never say (already exists on Project)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

**Migration:** Add relation from Project to ProjectFacts (optional, created on demand)

### 1.2 Facts Block in Prompts

Add to all generation prompts:

```
## GROUNDING FACTS (CRITICAL)
You must ONLY use these verified facts. Do NOT invent details.

### Product Features
${projectFacts.features.map(f => `- ${f}`).join('\n')}

### Workflow Steps (correct order)
${projectFacts.workflowSteps.map((s, i) => `${i+1}. ${s}`).join('\n')}

### Allowed Offers/Promos
${projectFacts.promos.length > 0 ? projectFacts.promos.join(', ') : 'NONE - do not mention any promos'}

### Allowed Proof/Stats
${projectFacts.allowedProof.length > 0 ? projectFacts.allowedProof.join(', ') : 'NONE - do not claim stats'}

### Forbidden Claims
${project.forbiddenClaims.join(', ')}

RULES:
- If a fact is not listed above, DO NOT include it
- Do NOT invent promos, discounts, trials, or guarantees
- Do NOT invent statistics, user counts, or reviews
- Do NOT mention features not in the features list
```

### 1.3 Groundedness Validator

**File:** `apps/api/src/generation/groundedness.service.ts`

```typescript
interface GroundednessResult {
  passed: boolean;
  score: number;              // 0-100
  violations: GroundednessViolation[];
}

interface GroundednessViolation {
  type: 'promo' | 'proof' | 'feature' | 'absolute' | 'timeline';
  text: string;               // The offending text
  suggestion?: string;        // How to fix it
}
```

**Detection Rules (Regex + Heuristics):**

| Category | Patterns | Action |
|----------|----------|--------|
| **Absolute claims** | "only", "best", "ultimate", "guaranteed", "#1" | Flag |
| **Scale claims** | "thousands", "millions", "everyone" | Flag |
| **Hidden promos** | "free trial", "no credit card", "X% off", "promo code" | Check against allowedPromos |
| **Time promises** | "in X seconds", "instantly", "overnight" | Flag unless in facts |
| **Social proof** | "5-star", "reviews", "testimonials" | Check against allowedProof |
| **Ungrounded features** | Any feature claim | Check against features list |

### 1.4 Rewrite Loop (Never Reject)

**Logic:**

```
1. Generate script
2. Run groundedness check
3. If violations found:
   a. Attempt rewrite with strict instruction:
      "Remove these violations: [list]. Keep structure. Output JSON only."
   b. Run groundedness check on rewrite
   c. If rewrite passes OR is better → use rewrite
   d. If rewrite worse → keep original + add warnings
4. Always deliver the script (never reduce count)
```

**Key principle:** User paid for N scripts → User gets N scripts. Warnings are acceptable, missing scripts are not.

---

## Phase 2: Scoring Calibration (Week 1-2)

### 2.1 Persona Schema Upgrade

**Add required fields to Persona:**

```prisma
model Persona {
  // ... existing fields

  // Structured fields (required for scoring)
  painPoints    String[]   // 5-10 bullet phrases
  desires       String[]   // 5-10 bullet phrases
  objections    String[]   // 3-8 bullet phrases
  vocabulary    String[]   // Optional slang/terms they use
}
```

**Auto-generation fallback:**

If user provides only name/description:
1. On persona create, trigger LLM extraction
2. Generate painPoints, desires, objections from description
3. Save immediately (user can edit later)

### 2.2 Expand Cliché Patterns

**Current:** 13 generic phrases + 5 soft patterns = ~18 checks

**Target:** 100+ patterns organized by category

```typescript
const CLICHE_PATTERNS = {
  // Hook openers (overused)
  hookOpeners: [
    "here's the thing",
    "here's why",
    "here's how",
    "i kept seeing",
    "everyone's been asking",
    "pov: you finally",
    "nobody talks about",
    "stop scrolling if",
    "this changed everything",
    "game changer",
    "i found the easiest way",
    "struggling with",
    "you won't believe",
    "wait until you see",
    "okay so",
    // ... 30+ more
  ],

  // LLM smell phrases
  llmSmell: [
    "comprehensive solution",
    "seamless experience",
    "elevate your",
    "leverage the power",
    "transform your",
    "unlock the potential",
    "revolutionize",
    "cutting-edge",
    "game-changing",
    // ... 30+ more
  ],

  // Overused structures
  structures: [
    /not a[^,]+, not a[^,]+, just/i,  // "Not A, not B, just C"
    /no[^,]+, no[^,]+, just/i,        // "No X, no Y, just Z"
    /if you're (tired|sick|struggling)/i,
    // ... 20+ more
  ],

  // Excessive patterns
  excessive: [
    { pattern: /just/gi, max: 2 },
    { pattern: /literally/gi, max: 1 },
    { pattern: /!/g, max: 3 },
    { pattern: /\?/g, max: 3 },
  ]
};
```

### 2.3 Grounded Specificity

**Current:** Rewards any concrete detail (including hallucinations)

**New:** Only reward fact-backed details

```typescript
function scoreGroundedSpecificity(script: Script, facts: ProjectFacts): number {
  let score = 0;
  const text = extractAllText(script);

  // Reward: mentions of verified features
  for (const feature of facts.features) {
    if (textContainsConcept(text, feature)) {
      score += 10;
    }
  }

  // Reward: correct workflow references
  for (const step of facts.workflowSteps) {
    if (textContainsConcept(text, step)) {
      score += 8;
    }
  }

  // Reward: allowed proof usage
  for (const proof of facts.allowedProof) {
    if (textContainsConcept(text, proof)) {
      score += 12;
    }
  }

  // NO reward for unverified specifics
  // (those are handled by groundedness penalty)

  return Math.min(100, score);
}
```

### 2.4 Updated Scoring Weights

**New formula:**

```typescript
const WEIGHTS = {
  groundedSpecificity: 0.25,  // Fact-backed details
  novelty: 0.20,              // Cliché distance
  audienceFit: 0.25,          // Persona alignment
  hookStrength: 0.20,         // Stop-scroll power
  structureFit: 0.10,         // Ad pacing
};

// Penalties (applied after weighting)
const PENALTIES = {
  groundedness: -50,     // Per hallucination violation (heavy)
  diversity: -8,         // Per repeated hook opener
  clicheFamily: -10,     // Per repeated hook family in batch
};
```

---

## Phase 3: Learning Loop (Week 2-3)

### 3.1 Feedback Schema

```prisma
model ScriptFeedback {
  id        String   @id @default(cuid())
  scriptId  String
  script    Script   @relation(fields: [scriptId], references: [id])
  userId    String

  rating    String   // 'up' | 'down'
  reasons   String[] // Multi-select from predefined list
  note      String?  // Optional free text

  // Whether to apply as project rule
  applyToProject Boolean @default(false)

  createdAt DateTime @default(now())
}

// Predefined reasons
enum FeedbackReason {
  TOO_GENERIC
  CLICHE_LLM_SMELL
  WRONG_ORDER
  TOO_SALESY
  MADE_UP_DETAILS
  HARSH_TONE
  WEAK_HOOK
  WEAK_VISUALS
  WRONG_AUDIENCE
}
```

### 3.2 Feedback → Rules Pipeline

| Feedback Reason | Rule Update |
|-----------------|-------------|
| `CLICHE_LLM_SMELL` | Add flagged phrase to `bannedPhrases` |
| `MADE_UP_DETAILS` | Increase groundedness strictness |
| `WRONG_ORDER` | Update `workflowSteps` in ProjectFacts |
| `HARSH_TONE` | Add terms to `harshLabelsBan` |
| `TOO_SALESY` | Add tone rule: "reduce urgency" |
| `WEAK_HOOK` | Downweight that hook family |

### 3.3 Winners Anchoring (Simple Few-Shot)

**Storage:**

```prisma
model ProjectWinner {
  id        String   @id @default(cuid())
  projectId String
  project   Project  @relation(fields: [projectId], references: [id])

  type      String   // 'hook' | 'script' | 'visual'
  content   String   // The winning content
  angle     String?  // Optional angle association

  createdAt DateTime @default(now())
}
```

**Usage in prompts:**

```
## STYLE REFERENCE (from approved examples)
These hooks worked well for this project. Use as tone/style reference only.
Do NOT copy exact phrasing.

${winners.map(w => `- "${w.content}"`).join('\n')}
```

---

## Phase 4: Code Cleanup (Week 2)

### 4.1 Remove Quality Tier Logic

**Files to update:**

| File | Change |
|------|--------|
| `apps/api/src/config/models.config.ts` | Remove `getModelForQuality()`, use single model |
| `apps/api/src/generation/script-generator.service.ts` | Remove quality branching |
| `apps/api/src/generation/hook-generator.service.ts` | Remove quality-based ratios |
| `apps/api/src/batches/dto.ts` | Remove `quality` field from CreateBatchDto |
| `apps/api/prisma/schema.prisma` | Remove `quality` from Batch model |
| Frontend | Remove quality selector UI |

### 4.2 Single Model Configuration

```typescript
// models.config.ts
export const MODEL_CONFIG = {
  scriptGeneration: 'google/gemini-2.5-pro-preview',  // Best quality for all
  hookGeneration: 'google/gemini-2.5-flash-preview', // Fast for brainstorming
  repair: 'google/gemini-2.5-flash-preview',
  personaGeneration: 'google/gemini-2.5-flash-preview',
};
```

---

## Implementation Checklist

### Week 1: Groundedness + Scoring Fixes

- [ ] **ProjectFacts schema** - Prisma model + migration
- [ ] **ProjectFacts CRUD** - Service + controller
- [ ] **Facts block in prompts** - Update prompt builders
- [ ] **Groundedness validator** - New service with regex + fact-mapping
- [ ] **Rewrite loop** - Integrate into generation pipeline
- [ ] **Persona auto-generation** - LLM extraction on create
- [ ] **Expand cliché patterns** - 100+ patterns organized by category
- [ ] **Grounded specificity** - Replace old specificity scoring

### Week 2: Learning Loop + Cleanup

- [ ] **Feedback schema** - Prisma model + migration
- [ ] **Feedback API** - POST endpoint
- [ ] **Feedback UI** - Component with reasons
- [ ] **Feedback → rules** - Processing pipeline
- [ ] **Winners storage** - Schema + CRUD
- [ ] **Winners in prompts** - Few-shot injection
- [ ] **Remove quality tiers** - Code cleanup
- [ ] **Single model config** - Simplify model selection

### Week 3: Polish + Testing

- [ ] **Calibration testing** - Generate batches, verify scores match quality
- [ ] **Hook diversity** - Add embedding similarity check (optional)
- [ ] **Documentation** - Update QUALITY_SYSTEM_MVP.md
- [ ] **Analytics** - Track groundedness violations over time

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Hallucination rate | ~20% of scripts | < 2% |
| AudienceFit avg | 28 | 50-70 |
| Novelty avg (meaningful) | 97 (inflated) | 60-80 (calibrated) |
| "Made-up details" feedback | Common | Rare |
| "ChatGPT-ish" feedback | Common | Rare |

---

*Created: 2026-02-03*
*Status: Planning*
