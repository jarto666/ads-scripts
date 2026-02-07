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

### 2.1 Persona Schema Upgrade ✅

**Added fields to Persona model:**

```prisma
model Persona {
  // ... existing fields

  // Structured fields for scoring
  painPoints    String[] @default([])  // 4-6 specific problems
  desires       String[] @default([])  // 4-6 outcomes/goals
  objections    String[] @default([])  // 3-4 purchase hesitations
}
```

**Two AI generation modes (Pro feature):**

1. **Full generation** (`POST /personas/:projectId/generate`)
   - User provides natural language prompt describing target audience
   - AI generates complete persona: name, description, demographics, painPoints, desires, objections
   - Supports draft mode (no project yet) with optional productName/productDescription

2. **Selective enrichment** (`POST /personas/:projectId/enrich`)
   - User fills basic persona info (name, description, demographics)
   - User selects which fields to AI-generate: `painPoints`, `desires`, `objections`
   - AI enriches only the requested fields based on persona context

### 2.2 Expand Cliché Patterns ✅

**Implemented:** `apps/api/src/generation/cliche-patterns.ts`

**Pattern counts:**
| Category | Count | Penalty |
|----------|-------|---------|
| `hookOpeners` | 47 | -15 pts (break after first) |
| `llmSmell` | 46 | -12 pts each |
| `genericFiller` | 38 | -10 pts each |
| `structures` | 21 regex | -8 pts each |
| `excessive` | 9 limits | variable per extra |

**Total: 161 patterns** (up from ~49)

**Integration:**
- `rerank.service.ts` imports and uses for `scoreHookStrength()` and `scoreNovelty()`
- `scoring.service.ts` imports `llmSmell` for `scoreAuthenticity()`

### 2.3 Grounded Specificity ✅

**Implemented:** `apps/api/src/generation/rerank.service.ts`

**Scoring breakdown (when ProjectFacts available):**
| Source | Points | Max |
|--------|--------|-----|
| Features | +10 each | 40 |
| Workflow steps | +8 each | 24 |
| Allowed proof | +12 each | 24 |
| Allowed promos | +8 each | 16 |
| Pricing mention | +10 | 10 |
| Product name | +10 | 10 |

**Fallback:** If no ProjectFacts, uses keyword matching from product description (legacy behavior).

**Key methods:**
- `scoreSpecificity()` - Entry point, routes to grounded or keyword scoring
- `scoreGroundedSpecificity()` - Fact-backed scoring
- `scoreKeywordSpecificity()` - Fallback keyword matching
- `textContainsConcept()` - Fuzzy concept matching (majority of keywords)

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

- [x] **ProjectFacts schema** - Prisma model + migration ✓
- [x] **ProjectFacts CRUD** - Service + controller ✓
- [x] **Facts block in prompts** - Update prompt builders ✓
- [x] **Groundedness validator** - New service with regex + fact-mapping ✓
- [x] **Rewrite loop** - Integrate into generation pipeline ✓
- [x] **ProjectFacts UI (Wizard)** - Added to Step 2 (Brand & Facts) with AI generation ✓
- [x] **ProjectFacts UI (Settings)** - GroundingFactsCard in Brand tab ✓
- [x] **ProjectFacts AI generation** - Extracts facts + brandVoice + forbiddenClaims ✓
- [x] **Persona AI generation** - Full generation + selective field enrichment (Pro feature) ✓
- [x] **Expand cliché patterns** - 115+ patterns in 5 categories (cliche-patterns.ts) ✓
- [x] **Grounded specificity** - Fact-backed scoring in rerank.service.ts ✓

### Week 1.5: Hook A/B/C Variants + CTA Expansion (2026-02-06)

- [x] **Hook variants schema** - Added `hookVariants Json?` to Script model ✓
- [x] **HookVariantService** - Gemini Flash generates 2 hook rewrites + adapted beats per script (single LLM call) ✓
- [x] **Pipeline integration** - Step 6.5 generates A/B/C variants in parallel after reranking ✓
- [x] **CTA expansion** - Increased from 3 to 5 CTAs per script ✓
- [x] **Frontend variant tabs** - Pill-style A/B/C tabs with storyboard switching ✓
- [x] **Export support** - PDF shows labeled Hook A/B/C, CSV has Hook A/B/C columns, analytics JSON includes variants ✓

### Week 2: Learning Loop + Cleanup

- [ ] **Feedback schema** - Prisma model + migration
- [ ] **Feedback API** - POST endpoint
- [ ] **Feedback UI** - Component with reasons
- [ ] **Feedback → rules** - Processing pipeline
- [ ] **Winners storage** - Schema + CRUD
- [ ] **Winners in prompts** - Few-shot injection
- [x] **Remove quality tiers** - Flattened to single Pro model, removed quality branching ✓
- [x] **Single model config** - All scripts use Gemini 3 Pro ✓

### Week 2.5: Incremental Persistence + Crash Recovery (2026-02-07)

- [x] **Incremental DB persistence** - Scripts saved as `generating` → `generated` during pipeline ✓
- [x] **Crash recovery** - Detects existing scripts on restart, skips to rerank or restarts clean ✓
- [x] **DB-backed progress** - Progress computed from real DB counts, survives page refresh ✓
- [x] **Credit refunds** - Auto-refund for under-delivery (failed scripts) ✓
- [x] **LLM-generated hook variants** - Replaced pool runner-ups with Gemini Flash rewrites of the original hook (same intent, different approach). Single call per script generates 2 variants + adapted beats ✓

### Future: Script-Level Overgeneration

Currently overgeneration only happens at the hook level (generate 2.4x hooks, select top N). Script generation is 1:1 with selected hooks. Adding script-level overgeneration would:
- Generate `requestedCount * OVERGEN_RATIO.scripts` (1.6x) scripts
- Rerank all, keep top `requestedCount`, mark rest as `rejected`
- Improve quality by giving the reranker more candidates to choose from
- Requires: hook generator returns more selected hooks than `requestedCount`
- Status flow would become: `generating → generated → completed | rejected`

### Infra: Production Seed Data

- [x] **Seed via migration** - English StylePolicy seeded in migration `20260207153948_seed_english_style_policy` with `ON CONFLICT DO NOTHING` ✓
- [x] **Removed seed.ts** - Seed data now lives in migration history, runs automatically with `prisma migrate deploy` ✓
- [ ] **Verify StylePolicy active** - After deploying, confirm style filter catches banned phrases on generated scripts

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
*Updated: 2026-02-07*
*Status: Week 2.5 - Incremental persistence + crash recovery shipped. Next: Learning Loop, then script-level overgeneration.*
