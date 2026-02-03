# Review of Opus’ Response + Consolidated Recommendations (English, “More = Better”)
**Goal:** Convert your product from “LLM wrapper” into a system that measurably improves output quality over time, *without changing models*.  
**Scope:** Prompt discipline, data grounding, scoring calibration, filtering/reranking, hook engine, and learning loop.  
**Inputs referenced:** Opus review text + your existing QUALITY system design + observed batch pathologies (inflated novelty, low audience fit, hallucinated facts/promos, generic hooks).

---

## 0) Executive Summary (What’s true + what must change)
Opus is directionally correct: the top problems are **(1) missing structured persona data, (2) inflated novelty, (3) specificity rewarding hallucinations, (4) weak hook gate, (5) groundedness not dominant**.

However, there are important additions and corrections:

1) **You need hard gating or forced rewrite on hallucinations**, not only a ranking penalty. Agencies treat invented claims as a deal-breaker.  
2) **Regex-only groundedness checks are insufficient**; you need “claim-to-fact mapping” (fact coverage) to catch subtle inventions.  
3) **AudienceFit must be split** into Persona Alignment vs Voice Authenticity. One number cannot represent both.  
4) “Overgeneration pipeline” is not enough without **selection logic**: hook family diversity + anti-cliché + semantic dedupe.  
5) “Embedding similarity is over-engineering” is incorrect when scoped to **hooks only**. Semantic duplicates will slip past 3-word opener checks.  
6) “RAG is complex” is only true for full retrieval. A *minimal winners anchoring* (2–3 best examples) is simple and high ROI.

Bottom line: Keep Opus’ Tier 1 priorities, but tighten enforcement and add minimal semantic controls.

---

## 1) What Opus Got Right (Agreement)
### 1.1 AudienceFit fails if persona fields are missing
- If persona matching depends on painPoints/desires and those are absent, AudienceFit will be chronically low even when content is relevant.
- Fixing this is necessary both for ranking and for analytics credibility.

### 1.2 Novelty is inflated
- Novelty scores 97–100 while output feels generic indicates your novelty metric measures “did not match a small cliché list,” not “actually fresh.”

### 1.3 Specificity rewards hallucinations (critical)
- Any scoring approach that rewards “concrete detail” without verifying it is grounded will push the model toward plausible fabrication.

### 1.4 HookStrength threshold too low
- A threshold at 30 makes filtering meaningless; almost everything passes.

### 1.5 Groundedness must become dominant
- This is the core differentiator vs baseline ChatGPT for agency users.

---

## 2) Where Opus Is Incomplete / Where to Push Back
### 2.1 “Embedding similarity for hook diversity is over-engineered” — disagree (with scoped implementation)
Models generate *semantic duplicates* with different wording:
- “I found the easiest way…” vs “Here’s the simplest way…”
3-word opener checks will miss this.

**Minimal implementation (not over-engineering):**
- Compute embeddings for hooks only (short strings).
- Compare within-batch (N hooks) to detect near-duplicates (cosine >= 0.90–0.93).
- Apply diversity penalty OR replace duplicates with next-best candidate.
Cost: low. Impact: high.

### 2.2 “RAG-like winners anchoring is complex” — only if fully built
You don’t need full retrieval to get “learns my taste”:
- Store top-rated hooks/scripts per project
- Include 2–3 as style anchors (few-shot) in the prompt
- Add instruction: “Do not reuse exact phrasing; use as tone reference only”
This is simple and delivers immediate “adaptive” feel.

### 2.3 Penalty-only groundedness is risky; you should gate or rewrite
A -40 penalty can still let hallucinations leak if:
- other scores are high
- penalty weight changes
- your scoring distribution drifts

**Better policy:**
- If hallucination is detected: **hard reject** OR **forced rewrite loop** (max 1–2 iterations).
- Keep the penalty as a fallback for “draft mode,” but not for premium “ready-to-shoot” outputs.

---

## 3) Must-Do: Groundedness as a First-Class Layer (Core Differentiator)
### 3.1 Introduce ProjectFacts as the “source of truth”
Create structured facts per project/client:
- productFacts: what it is, what it does
- features: bullet list
- workflowSteps: correct order (e.g., “choose template → upload photo”)
- offerFacts: pricing, trials, promos (explicitly)
- proofClaims: allowed proof (numbers, testimonials) only if provided
- allowedClaims / forbiddenClaims
- CTA rules: allowed CTAs
- toneOfVoice: DO / DON’T
- bannedPhrases: per project
- harshLabelsBan: e.g., ugly/terrible/crappy
- disclaimers: if relevant

**Principle:** If it isn’t in ProjectFacts, the system must not claim it.

### 3.2 Groundedness enforcement mechanism (3-part)
(1) Prompt-level:
- Provide a FACTS block (structured JSON or bullet list)
- Hard instruction:
  - “Use only these facts. If missing, omit.”
  - “Do not invent promos, timelines, guarantees, social proof.”
(2) Post-gen validator:
- Detect ungrounded or disallowed claims.
(3) Rewrite/gate:
- If violations: rewrite removing them (keep structure).
- If still violating: reject or mark as “needs input”.

### 3.3 Regex checks are good, but you also need claim-to-fact mapping
Regex catches obvious:
- “only/best/thousands/guaranteed/10 seconds/no credit card”
But misses:
- “full suite”
- “all-in-one”
- invented workflow steps
- invented feature descriptions

**Add a mapping layer (MVP feasible):**
- For each sentence/claim, attempt to map to:
  - feature keys
  - workflow step keys
  - offer facts
  - allowed proof claims
- If not mappable -> “unsupported claim”.

You can implement mapping via:
- controlled keyword maps + synonyms (fast)
- optional LLM judge that returns JSON list of unsupported claims (still cheap, limited to small text)

### 3.4 Groundedness should dominate final acceptance
Recommended policy:
- If unsupported claim count > 0 AND claim is “hard category” (promo, proof, guarantee, workflow): **hard fail**.
- Otherwise: penalty + rewrite.

---

## 4) Fix the Scoring System So It Tracks Human Judgment
### 4.1 Split “AudienceFit” into two metrics
**PersonaAlignmentScore (relevance):**
- Does it hit persona pains/desires/objections?

**VoiceAuthenticityScore (UGC naturalness):**
- Does it sound like real spoken UGC or LLM-y ad copy?

Why split:
- A script can be highly relevant but still “ChatGPT-ish”
- Agencies care about both, and they behave differently over time

### 4.2 Persona schema upgrade: make structured fields required or auto-generated
Ensure each persona has:
- painPoints: 5–10
- desires: 5–10
- objections: 3–8
- vocabulary/slang: optional 10–30
- taboo phrases: optional (what to avoid)

If user provides only name/description:
- auto-generate painPoints/desires/objections once at project setup
- present for quick edit/approval

### 4.3 Redefine Novelty as “distance from cliché templates”
Stop measuring novelty as “didn’t hit a tiny cliché list”.
Replace with:
- clichéPatternMatches (weighted regex bank)
- hookFamilyPenalty (repeat families within a batch)
- semanticSimilarityPenalty (embedding similarity to existing hooks)

Practical MVP:
- Expand cliché list to 50–200 patterns.
- Create hook family classifier (simple regex):
  - “Struggling with X?”
  - “I found the easiest way…”
  - “Stop doing X until you see Y”
  - “You don’t need X…”
  - “Here’s how to…”
- Penalize repeats.

### 4.4 Convert Specificity into “Grounded Specificity”
Specificity should reward:
- early mention of relevant *fact-backed* details
- correct workflow steps
- accurate constraints

Specificity must NOT reward:
- invented numbers
- invented social proof
- invented promos
- unrelated brand/game mentions

Implementation:
- specificity = weighted count of fact-backed mentions
- groundedness = 100 - unsupported claim penalty
- If groundedness low, finalScore must tank.

### 4.5 HookStrength: move from checkboxes to stop-scroll composite
Current heuristics (question marks, power words) are not enough.
Compute HookStrength from:
- PatternInterruptScore (visual + action in first 1–2s)
- TensionScore (problem/objection/conflict immediately)
- CuriosityScore (open loop)
- GroundedSpecificityEarly (real detail early)
- ClichéPenalty (strong)

Then set premium thresholds:
- HookStrengthThreshold: 55–65 for premium outputs

### 4.6 Add StructureFit (ad pacing)
For 15s:
- Hook: 0–2/3s
- Pain/Problem: 2–6s
- Mechanism/Solution: 6–11s
- CTA: 11–15s
Rule-based check on storyboard beats:
- penalize missing early benefit
- penalize missing CTA
- penalize “brand dump” too early

---

## 5) Build a Real Hook Engine (the “Why pay?” feature)
### 5.1 Two-phase hook pipeline
Phase 1 (divergent):
- generate 15–30 hook candidates per angle/persona/duration
- enforce variety by hook types:
  - pattern interrupt (visual)
  - contrarian
  - objection flip
  - “3 mistakes”
  - curiosity gap
  - micro-story
  - proof-first (only if proof facts exist)

Phase 2 (convergent):
- score each hook:
  - groundedness (must pass)
  - cliché penalty
  - persona alignment
  - semantic dedupe
- output top 5:
  - 1 primary hook
  - 4 alternates

### 5.2 Hook diversity selection (must-have)
Even if you overgenerate, you must select diverse hooks:
- no two hooks from same family in top 5
- no near-duplicate semantics (embedding similarity)

---

## 6) Learning Loop: Make It “Improve After My Feedback” (No Fine-tune Needed)
### 6.1 Feedback UX
Per script/hook:
- 👍 / 👎
- reasons:
  - too generic
  - cliché/LLM smell
  - wrong order
  - too salesy
  - made-up details
  - harsh tone
  - weak hook
  - weak visuals
- optional note
- toggle: “remember this for this project”

### 6.2 Convert feedback into durable rules
Examples:
- wrong order -> update workflowSteps preference
- made-up details -> tighten groundedness strictness + add new banned promos
- cliché -> append phrase/pattern to bannedPhrases
- harsh tone -> expand harshLabelsBan
- too salesy -> add tone rules (reduce urgency, remove exclamations, soften claims)
- weak hook -> downweight that hook family for this project

This creates immediate “learning” because next generations stop repeating disliked patterns.

### 6.3 Capture user edits as training signals
If scripts are editable:
- store original + edited
- extract:
  - removed phrases -> add banned patterns
  - rewrites -> update tone rules
  - reordered steps -> workflow rule

---

## 7) Minimal “Winners Anchoring” (Not Full RAG)
### 7.1 Store winners
Persist:
- best-rated hooks
- best-rated scripts
- best visual metaphors / shot ideas

### 7.2 Use as few-shot anchors (simple)
At generation time:
- include 2–3 best hooks as examples
- instruction:
  - “Do not copy phrasing; use only as style reference”
- apply similarity penalty to prevent copying

Why it matters:
- This is the fastest way to feel “trained” on the user/project without finetuning.

---

## 8) Post-Processing: Style Linter + Auto-Rewrite
### 8.1 Linter checks (minimum)
- banned patterns
- just/literally counts
- exclamation marks threshold
- harsh labels
- absolutes (only/best/guaranteed)
- invented promo claims
- invented proof numbers
- unrealistic time promises (exact seconds)

### 8.2 Rewrite loop
If violations:
- rewrite pass:
  - keep structure
  - keep facts
  - remove banned phrases
  - remove inventions
  - output strict JSON
Re-run linter; stop after 1–2 iterations.

---

## 9) Implementation Plan (Phased, Practical)
### Tier 1 (This week): Credibility + metric alignment
1) ProjectFacts schema + minimal UI
2) Facts-only instruction in prompts
3) Groundedness validator:
   - regex + claim-to-fact mapping
   - hard gate or rewrite on violations
4) Persona schema upgrade with auto-generation
5) Fix scoring definitions:
   - specificity -> grounded specificity
   - novelty -> expanded cliché bank + family penalties
   - audienceFit -> persona alignment (temporary) + later split

### Tier 2 (Next week): Differentiation + learning
6) Hook engine: generate 20+ hooks, rank, return 5 diverse
7) Feedback UI -> updates project rules
8) Minimal winners anchoring (2–3 examples)

---

## 10) Acceptance Criteria (How you’ll know it worked)
### 10.1 Credibility metrics
- Unsupported claim count approaches 0 for premium outputs.
- “Invented promo/CTA/proof” flags near 0.
- Marketers stop reporting “it makes up stuff.”

### 10.2 Perceived value vs ChatGPT
- Users report: “It gives me 5 strong hooks I wouldn’t have gotten quickly.”
- Reduction in “ChatGPT-ish” indicators (just/literally/!!!, cliché patterns).

### 10.3 Score correlation
- After changes, internal human rating (1–5) should correlate with finalScore.
- If correlation is poor, adjust metric weights—not the model.

---

## 11) Notes on Common Failure Modes (Avoid these)
- “We improved scores by tweaking weights” without improving outputs → solve with human correlation checks.
- Over-reliance on regex → add claim-to-fact mapping or LLM judge for unsupported claims.
- Overgeneration without diversity selection → results feel repetitive.
- Feedback captured but not applied to rules → “learning” feels fake.
- Groundedness as a soft penalty → hallucinations still leak.

---

## 12) Concrete Next Tasks for Claude Code (Checklist)
- [ ] Add `ProjectFacts` (db + service + minimal UI)
- [ ] Add persona structured fields + auto-generation fallback
- [ ] Implement groundedness validator:
      - regex triggers
      - claim-to-fact mapping
      - violation categories: promo/proof/workflow/feature
- [ ] Add rewrite pass on violations (max 2)
- [ ] Expand cliché pattern bank to 50–200 patterns + family classifier
- [ ] Update scoring formulas:
      - specificity -> grounded specificity
      - novelty -> cliché distance + family + semantic dedupe
      - audienceFit split (persona alignment now, voice authenticity next)
- [ ] Raise hook threshold for premium
- [ ] Implement hook engine:
      - generate 20 candidates
      - select 5 diverse + best
- [ ] Add feedback UI + persistence + rule updates
- [ ] Add minimal winners anchoring (2–3 examples) + similarity guard
