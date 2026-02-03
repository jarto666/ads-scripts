# Quality System Improvements – Actionable Recommendations (No Model Switching)

Context
- Goal: make the product feel like an "improving system" (learning + differentiating) rather than a thin wrapper over an LLM.
- Constraints: keep current model choices; focus on prompt discipline, data grounding, scoring calibration, filtering, reranking, and feedback loop.
- Source artifacts:
  - QUALITY_SYSTEM_MVP.md (definitions for Specificity / Novelty / AudienceFit / HookStrength + scoring pipeline)
  - SYSTEM_ARCHITECTURE_COMPLETE.md (pipeline and intended quality layers)
  - Example batch export (Metroid-related) showing:
    - novelty ~ 90–100 for most scripts
    - audienceFit very low across scripts even when persona seems relevant
    - scripts include ungrounded / made-up claims (e.g., "thousands", "only hub", "exclusive", unrelated games)
    - hooks often feel generic despite high "novelty"

---

## 1) Diagnosis Summary – What’s Actually Broken

### 1.1 AudienceFit is structurally doomed if persona data is missing
Symptoms observed:
- Personas in the batch have only `name` and truncated `description`.
- Your AudienceFit definition relies on structured persona fields (painPoints/desires). If they are missing or empty, the metric will remain low even for "obviously relevant" scripts.
Net effect:
- You will under-rank scripts that actually match the persona.
- "Learning" looks broken because feedback doesn't move the number.

### 1.2 Novelty is inflated and not measuring "creative novelty"
Symptoms:
- novelty ~97 avg and many 100s, while text feels generic.
Root cause pattern:
- novelty likely computed as `100 - penalties` using a short cliché/pattern list.
- It measures “did not trigger our small set of cliché patterns” not “this is meaningfully fresh”.
Net effect:
- The metric will stay green even when output is ChatGPT-ish.
- Your system can’t optimize for creativity because the signal is weak.

### 1.3 Specificity is over-rewarding “any concrete detail,” including hallucinations
Symptoms:
- Scripts contain high specificity but include:
  - absolute claims ("only hub", "thousands")
  - unprovided promos/CTAs
  - unrelated game footage suggestions
Root cause pattern:
- specificity computed via feature/keyword mentions, not grounded fact compliance.
Net effect:
- You reward the model for inventing plausible details.
- This directly conflicts with user feedback “stop making things up”.

### 1.4 HookStrength is too heuristic and threshold is too low
Symptoms:
- HookStrength threshold set around 30; nearly everything passes.
- Hooks are "safe openers" (I found..., Struggling with..., Stop wasting...) without strong pattern interrupts.
Root cause:
- HookStrength computed from checkboxes (question mark, power words, length, etc.), not stop-scroll psychology.
Net effect:
- Filtering doesn’t filter.
- Reranking doesn’t consistently pull the best hooks.

### 1.5 Missing: Groundedness / Truthfulness scoring is not dominant enough
Symptoms:
- You have hallucination detection in concept, but in practice scripts with invented claims are not harshly penalized.
Net effect:
- You ship "confident falsehoods" which destroys product credibility for marketers who already use ChatGPT.

---

## 2) Core Product Reframe (still targeting agencies) – What “learning” must mean
For agencies, “improving” means:
- fewer clichés and “LLM smell”
- fewer invented promos/claims
- better hooks with multiple variants
- better visual direction and creative specificity
- better adherence to the client’s workflow rules (e.g., template → upload photo order)
- faster production-ready exports (scripts tagged by angle, duration, persona)

Therefore:
- The quality system must optimize *ad deliverables* rather than generic writing.

---

## 3) Must-Add Missing System Layer: Groundedness (Fact Compliance)
This is the single biggest credibility lever. It must be first-class.

### 3.1 Introduce ProjectFacts as a “ground truth” bundle
Add persistent structured data per project (and per client, if agency):
- productFacts: what the product is / does
- offerFacts: pricing / trial / CTA rules / promo rules
- workflowSteps: required order of actions (for SaaS flows)
- allowedClaims: claims you are allowed to make
- forbiddenClaims: hard "never mention"
- toneOfVoice: DO/DON'T statements
- bannedPhrases: project-level cliché list (expandable by feedback)
- harshLabelsBan: harsh adjectives and insulting language (ugly/terrible/crappy...)
- platformConstraints: for ads (duration, CTA types, disclaimers)

Key principle:
- Any detail not present in facts must not be invented.

### 3.2 Enforce “Do not invent” via 3-part mechanism
(1) Prompt-level grounding instruction:
- Provide a FACTS block (structured) and instruct:
  - "Only use these facts. If missing, omit."
  - "Do not add promo codes, trials, guarantees unless in facts."
(2) Post-generation validator:
- Detect ungrounded claims (see below).
(3) Auto-rewrite or regeneration:
- If violations found, rewrite removing invented details.

### 3.3 Implement a Groundedness score + hard penalty
Add `groundednessScore (0-100)` and `hallucinationPenalty`.
Rules:
- If hallucination is detected:
  - Either hard fail (reject) OR apply large penalty (-30 to -60) so it cannot outrank grounded scripts.
- This needs to dominate the finalScore.

### 3.4 Starter validator rules (cheap, high impact)
Implement these rule checks immediately (regex + keyword heuristics):
- Absolute superlatives: "only", "best", "ultimate", "guaranteed", "instantly", "in 10 seconds"
- Scale claims: "thousands", "millions", "everyone is"
- Hidden promos: "no credit card", "free trial", "first X free", "promo code"
- Unprovided product surface: "all ads in one place", "full suite", etc.
- Unrelated brand/game names not in facts
- Non-existent social proof: "5-star reviews", "discord comments" unless provided in facts

Rewrite strategy:
- Replace ultra-specific time promises with ranges:
  - "in 10 seconds" → "in under a minute" (only if truthfully supported by product)
- Replace absolutes with soft claims:
  - "only hub" → "a great hub"

---

## 4) Fix the Scoring System (so it matches human judgment)
This is about making metrics *useful*, not merely measurable.

### 4.1 AudienceFit: split into two metrics
Current audienceFit is overloaded. Split it:
1) personaAlignmentScore:
   - Does it hit pains/desires/objections of the selected persona?
2) voiceAuthenticityScore:
   - Does it sound like real UGC speech rather than "LLM sales copy"?

Implementation options:
- Rule-based + keyword overlap for personaAlignment if painPoints/desires are present.
- Voice authenticity heuristics:
  - penalize exclamation overuse, "just/literally"
  - penalize overly formal marketing phrases
  - reward contractions, short clauses, conversational cadence (careful; not too simplistic)

### 4.2 AudienceFit depends on persona fields — fix your persona schema
Make personas contain:
- painPoints: 5–10 bullet phrases
- desires: 5–10 bullet phrases
- objections: 3–8 bullet phrases
- vocabulary/slang: optional 10–30 tokens
- dislikedStyle: optional banned phrases for persona tone

If user doesn’t fill these:
- auto-generate them once (LLM extraction) from persona description + project facts
- allow user to edit quickly

### 4.3 Novelty: redefine to measure “distance from ad templates”
Novelty must not be “100 minus penalties from a tiny list”.
Replace/extend novelty with:
- clichéSimilarityPenalty:
  - compare hook/storyboard to a growing template bank of common patterns
- openerFamilyPenalty:
  - penalize repeated hook families (e.g., "Struggling with X?", "I found the easiest way...", "Stop X until you see Y", etc.)

Practical MVP implementation:
- Maintain a regex-based cliché bank (start with 50–200 patterns).
- For each hook and first beat (0–3s), compute:
  - count of cliché matches
  - match weight per pattern
- noveltyScore = 100 - weightedMatches - similarityPenalty

### 4.4 Specificity: turn into Grounded Specificity (stop rewarding hallucinations)
Replace or adjust specificity:
- specificityScore should only reward facts that are supported by ProjectFacts.
- Any “specific detail” not in facts should not increase specificity; it should decrease groundedness.

Implementation:
- Map each sentence to:
  - mentions of known fact keys (features/workflow steps/allowed claims)
  - unknown claims (flagged)
- specificity = groundedMentionsCount weighted by importance
- groundedness = 100 - unknownClaimsPenalty

### 4.5 HookStrength: make it a composite that reflects stop-scroll
Replace pure checklists with a composite:
- patternInterruptScore (0–30):
  - is there a strong visual/behavioral interrupt in 0–2s shot?
- tensionScore (0–25):
  - conflict/objection/pain present immediately
- curiosityScore (0–20):
  - open loop / "you’re doing X wrong"
- specificityScore (0–15):
  - grounded specifics early (not generic)
- clichéPenalty (-0 to -30)

HookStrength = sum - penalties
Then:
- Raise hook threshold significantly for premium quality.
  - Example: hookStrengthThreshold 55–65 for “premium”
  - Keep 35–45 for “standard”

### 4.6 Add a “Structure Fit” metric for 15s ads
A 15s ad generally needs:
- Hook (0–2/3s)
- Problem/pain (2–6s)
- Solution/mechanism (6–11s)
- CTA (11–15s)
Rule-based check:
- verify storyboard beats cover these stages
- penalize missing CTA, or late benefit reveal
This metric will prevent scripts that drift and bury the value.

---

## 5) Introduce a Real Hook Engine (the main differentiator)
Users explicitly asked: multiple hook variants per script and more creative stop-scroll.

### 5.1 Two-phase hook pipeline
Phase 1: Divergent generation
- Generate 15–30 hook candidates per angle/persona/duration.
- Categorize them by hook type:
  - Pattern interrupt (visual)
  - Contrarian
  - Objection flip
  - Curiosity gap
  - “3 mistakes”
  - Proof-first (only if facts allow)
  - Micro-story (I thought X until Y)
Phase 2: Convergent selection
- Score each candidate with:
  - clichéSimilarityPenalty
  - groundedness checks (no invented facts)
  - personaAlignment cues
  - length + cadence constraints
- Pick top 5 hooks:
  - 1 “best”
  - 4 alternates

Output contract:
- For each script include `hookVariants: [..]` and mark `selectedHookIndex`.

### 5.2 Hook diversity across the batch
You already have multiple angles; still, hooks can look same-family.
Add `hookFamilyDiversityPenalty`:
- classify each hook into a family (regex/LLM label)
- penalize repeated families in the same batch
This increases perceived variety.

---

## 6) Add Learning Loop (without fine-tune): Preferences + Feedback → Rules
This is how you make the system "trained" without training a model.

### 6.1 Feedback UX requirements
Per script:
- thumbs up / thumbs down
- multi-select reasons:
  - too generic
  - cliché / chatgpt-ish
  - wrong order
  - too salesy
  - made-up details
  - harsh tone
  - weak hook
  - weak visuals
- optional note: “what to change”
- optional toggle: “Remember this rule for this project”

### 6.2 Convert feedback to durable Playbook updates
On feedback submission:
- If reason = "wrong order":
  - update `workflowSteps` or add rule: "always say X before Y"
- If reason = "made-up details":
  - increase strictness of hallucination filter for this project
  - append “Only mention CTA from CTA rules”
- If reason = "cliché":
  - append phrase/pattern into `bannedPhrases`
- If reason = "harsh tone":
  - append into `harshLabelsBan`
- If reason = "too salesy":
  - update toneOfVoice: “avoid urgency, reduce hype, no exclamations”
- If reason = "weak hook":
  - mark hook family as low-performing for this project and reduce its selection weight

This creates immediate perceived learning:
- “I downvoted this pattern; it stopped appearing next time.”

### 6.3 Store human edits as training signals
If you allow in-app editing:
- store original + edited versions
- compute a diff and extract:
  - removed phrases → add to bannedPhrases
  - replaced phrasing style → update tone rules
  - changed order → workflow rule
This becomes your long-term style adaptation mechanism.

---

## 7) Add a Script Library + “RAG-like” style anchoring
This is the second major differentiator after Hook Engine.

### 7.1 Save "winners"
Store:
- best-performing scripts per project (thumbs up or high score)
- best hooks per angle/persona
- best visual metaphors / shot ideas

### 7.2 Use winners as few-shot anchors
During generation:
- include 2–4 “approved examples” from the library as style anchors
- ensure:
  - no verbatim copying (similarity check)
  - preserve project facts and tone
This creates the feeling: "the tool is trained on my taste".

### 7.3 Add similarity penalty against library
Prevent the model from repeating itself:
- compute embedding similarity hook-to-hook
- penalize near-duplicates
This increases novelty in the correct way.

---

## 8) Autopopulation from URL/docs (Quality lever, not only UX)
This solves “user will try ChatGPT first” because you can immediately show stronger grounding.

### 8.1 URL ingestion pipeline
Inputs:
- website URL (landing/product)
Process:
1) Fetch HTML (browserless/playwright optional if needed for JS)
2) Extract main content (Readability-like)
3) LLM extraction into `ProjectFacts` JSON:
   - product description
   - key features
   - workflow steps
   - proof claims (if present)
   - CTA rules
   - forbidden claims (if regulated niche)
4) User review UI: quick edit
Outputs:
- populated project profile with grounding facts

### 8.2 Document upload
Allow uploading:
- brief / ICP / ToV / allowed claims / banned phrases / past scripts
Use LLM to extract and merge into ProjectFacts.
Important:
- merge strategy must be transparent; show diffs and allow user to accept/reject.

---

## 9) Post-processing: Style Linter + Auto-Rewrite
To remove “LLM smell” reliably, do not rely on one-shot generation.

### 9.1 Linter checks (minimum set)
- banned phrases/patterns match
- just/literally counts > threshold
- exclamation count > threshold
- harsh labels present
- absolute claims present (only/best/guaranteed)
- invented promo/CTA triggers
- unrealistic time promise triggers

### 9.2 Rewrite step (cheap and deterministic)
When violations found:
- run "rewrite pass" with strict instruction:
  - keep structure, keep facts, remove banned phrases, reduce hype, output JSON only
- After rewrite, rerun linter.
Stop after 1–2 iterations to control cost/latency.

---

## 10) System-Level Implementation Plan (2-week sequence)
This is designed to deliver visible improvement quickly.

### Week 1 — Stop being “ChatGPT-ish” + stop hallucinations
1) ProjectFacts schema + storage
2) Persona schema upgrade (painPoints/desires required; auto-generate if absent)
3) FACTS block in prompt + "no invention" instruction
4) Groundedness validator + heavy penalty / reject
5) Style linter: banlist + just/literally/!!! + harsh labels + absolutes
6) Auto-rewrite pass

Deliverable by end of week:
- scripts stop inventing promos
- fewer clichés
- scores start correlating with human feedback

### Week 2 — Differentiator: Hook Engine + Learning loop
1) Hook ideation (15–30 variants per angle/persona)
2) Hook ranking with cliché + groundedness + persona alignment
3) Return top 5 hooks per script (1 selected + 4 alts)
4) Feedback buttons (👍/👎 + reasons)
5) Feedback → update project rules (banned phrases, workflow rules, strictness)

Deliverable by end of week:
- user sees “stronger than base ChatGPT” due to hook variants + less cliché
- user sees tool improving after feedback

---

## 11) Final Scoring Recommendation (so analytics becomes actionable)
Define finalScore as a constrained composite:

Hard gates (must-pass):
- groundednessScore >= 80 (or no hallucination flags)
- styleLinter violations under threshold

Soft composite:
- HookStrength (new composite) 30%
- PersonaAlignment 20%
- VoiceAuthenticity 15%
- GroundedSpecificity 15%
- StructureFit 10%
- Filmability 10% (optional, but keep)

Penalties:
- clichéSimilarityPenalty (strong)
- hallucinationPenalty (strong)
- hookFamilyDupPenalty within batch
- repeated wording penalty

Why this works:
- It aligns ranking with what marketers care about:
  - credibility
  - hook strength
  - natural voice
  - production-ready structure

---

## 12) Quick Checklist of What to Change in Existing System (Minimal edits)
If you want the smallest possible diff that still moves the needle:

1) Add required persona fields: painPoints/desires; auto-fill if empty.
2) Add groundednessScore + hallucinationPenalty that dominates.
3) Expand novelty penalties to match real “chatgpt-ish” cues:
   - just/literally/!!!
   - Not A not B just C
   - No X no Y just Z
4) Raise hook threshold (premium) to 55–65.
5) Add hookVariants (5–10) per script and rank them.
6) Add feedback UI and persist bans/rules per project.

This is enough to shift perception from “wrapper” to “tool that learns”.
