# Codebase Refactoring Plan

> **Status:** Planning
> **Created:** 2026-02-04

## Problem

1. **Files too large** - Hard to navigate, 2,600+ line pages
2. **Folder structure messy** - `/generation` has 13 files with mixed concerns
3. **No component organization** - Only 2 custom components in `/components`

---

## Current Structure Problems

### API: `/generation` folder (13 files, mixed concerns)
```
generation/
├── script-generator.service.ts  (46KB) ─┐
├── hook-generator.service.ts    (9KB)  ─┴─ Orchestration
├── prompt-builder.ts            (19KB) ─── Prompts
├── openrouter.client.ts         (3KB)  ─── LLM Client
├── scoring.service.ts           (13KB) ─┐
├── rerank.service.ts            (22KB) ─┴─ Scoring
├── cliche-patterns.ts           (6KB)  ─── Patterns
├── groundedness.service.ts      (10KB) ─┐
├── style-filter.service.ts      (8KB)  ─┴─ Validation
├── angles.config.ts             (8KB)  ─┐
├── platform-profiles.ts         (5KB)  ─┼─ Config
├── language-utils.ts            (2KB)  ─┘
└── generation.module.ts         (1KB)
```

### Web: `/components` folder (nearly empty)
```
components/
├── ui/              (25 shadcn files)
├── layout/
│   └── sidebar.tsx
├── persona-card.tsx
└── persona-dialog.tsx   ← Only 2 custom components!
```

---

## Proposed New Structure

### API: Split `/generation` by concern
```
src/
├── generation/                    # Orchestration only
│   ├── script-generator.service.ts
│   ├── hook-generator.service.ts
│   └── generation.module.ts
│
├── llm/                           # LLM infrastructure
│   ├── openrouter.client.ts
│   ├── prompt-builder.ts
│   └── llm.module.ts
│
├── scoring/                       # Quality scoring
│   ├── scoring.service.ts
│   ├── rerank.service.ts
│   ├── cliche-patterns.ts
│   └── scoring.module.ts
│
├── validation/                    # Content validation
│   ├── groundedness.service.ts
│   ├── style-filter.service.ts
│   └── validation.module.ts
│
└── config/                        # Shared config (existing)
    ├── models.config.ts
    ├── angles.config.ts
    ├── platform-profiles.ts
    └── language-utils.ts
```

### Web: Organize `/components` by domain
```
components/
├── ui/                    (keep as-is)
├── layout/
│   └── sidebar.tsx
├── scripts/               # Extracted from pages
│   ├── script-card.tsx
│   ├── voiceover-modal.tsx
│   └── script-filters.tsx
├── projects/              # Extracted from pages
│   ├── brand-facts-editor.tsx
│   └── generation-panel.tsx
├── personas/
│   ├── persona-card.tsx
│   ├── persona-dialog.tsx
│   └── attribute-pill.tsx
└── forms/                 # Shared form components
    └── list-field-editor.tsx
```

---

## File Size Analysis

### API - Largest Files
| File | Lines | Priority |
|------|-------|----------|
| `script-generator.service.ts` | 1,427 | **CRITICAL** |
| `rerank.service.ts` | 772 | HIGH |
| `prompt-builder.ts` | 555 | MEDIUM |

### Web - Largest Files
| File | Lines | Priority |
|------|-------|----------|
| `projects/[id]/page.tsx` | 2,682 | **CRITICAL** |
| `projects/new/page.tsx` | 1,603 | HIGH |
| `persona-dialog.tsx` | 611 | MEDIUM |

---

## Implementation Plan

### Phase 1: API Folder Restructuring (~3h)

**Move files to create cleaner separation of concerns:**

| From | To | Why |
|------|----|-----|
| `generation/openrouter.client.ts` | `llm/openrouter.client.ts` | LLM infrastructure |
| `generation/prompt-builder.ts` | `llm/prompt-builder.ts` | LLM infrastructure |
| `generation/scoring.service.ts` | `scoring/scoring.service.ts` | Scoring concern |
| `generation/rerank.service.ts` | `scoring/rerank.service.ts` | Scoring concern |
| `generation/cliche-patterns.ts` | `scoring/cliche-patterns.ts` | Scoring concern |
| `generation/groundedness.service.ts` | `validation/groundedness.service.ts` | Validation concern |
| `generation/style-filter.service.ts` | `validation/style-filter.service.ts` | Validation concern |
| `generation/angles.config.ts` | `config/angles.config.ts` | Config |
| `generation/platform-profiles.ts` | `config/platform-profiles.ts` | Config |
| `generation/language-utils.ts` | `config/language-utils.ts` | Config |

**Result:** `generation/` reduced from 13 → 4 files (orchestration only)

---

### Phase 2: Web Component Extraction (~4h)

#### 2.1 Extract from `projects/[id]/page.tsx` (2,682 → ~1,200 lines)

| Component | Lines | New Location |
|-----------|-------|--------------|
| `ScriptCard` | ~350 | `components/scripts/script-card.tsx` |
| `VoiceoverModal` | ~60 | `components/scripts/voiceover-modal.tsx` |
| `BrandFactsEditor` | ~400 | `components/projects/brand-facts-editor.tsx` |

#### 2.2 Extract from `projects/new/page.tsx` (1,603 → ~400 lines)

**Create `app/(dashboard)/projects/new/steps/` directory:**

| Component | New File |
|-----------|----------|
| `StepIndicator` | `steps/step-indicator.tsx` |
| `StepMethod` | `steps/step-method.tsx` |
| `StepUrlInput` | `steps/step-url-input.tsx` |
| `StepImporting` | `steps/step-importing.tsx` |
| `StepImportError` | `steps/step-import-error.tsx` |
| `StepBasicInfo` | `steps/step-basic-info.tsx` |
| `StepBrand` | `steps/step-brand.tsx` |
| `StepAudience` | `steps/step-audience.tsx` |
| `StepReview` | `steps/step-review.tsx` |

---

### Phase 3: Shared Form Components (~2h)

**`components/forms/list-field-editor.tsx`**
- Reusable list field with add/remove
- Used in: BrandFactsEditor, StepBrand, persona-dialog

**`components/personas/attribute-pill.tsx`**
- Consolidate PersonaCard CompactPill + PersonaDialog AttributePill

---

### Phase 4: API Service Splitting (Optional, ~3h)

#### Split `script-generator.service.ts` (1,427 → ~600 lines)

| New Service | Responsibility |
|-------------|----------------|
| `llm/llm-executor.service.ts` | LLM calls, JSON repair, retry |
| `generation/batch-orchestrator.ts` | Concurrency, parallel processing |

---

## Summary by Scope

| Scope | Tasks | Hours | Impact |
|-------|-------|-------|--------|
| **Folder restructure only** | Phase 1 | ~3h | Clean `/generation`, proper concerns |
| **+ Web components** | Phase 1-3 | ~9h | + Manageable page files |
| **Full refactor** | Phase 1-4 | ~12h | + Smaller services |

---

## Final Structure (Full Refactor)

```
apps/api/src/
├── generation/           # Orchestration only (4 files)
│   ├── script-generator.service.ts
│   ├── hook-generator.service.ts
│   ├── batch-orchestrator.ts
│   └── generation.module.ts
├── llm/                  # LLM infrastructure (3 files)
│   ├── openrouter.client.ts
│   ├── prompt-builder.ts
│   └── llm-executor.service.ts
├── scoring/              # Quality scoring (4 files)
│   ├── scoring.service.ts
│   ├── rerank.service.ts
│   ├── cliche-patterns.ts
│   └── scoring.module.ts
├── validation/           # Content validation (3 files)
│   ├── groundedness.service.ts
│   ├── style-filter.service.ts
│   └── validation.module.ts
└── config/               # Shared config (5 files)
    ├── models.config.ts
    ├── angles.config.ts
    ├── platform-profiles.ts
    ├── language-utils.ts
    └── index.ts

apps/web/src/
├── components/
│   ├── ui/               (keep as-is)
│   ├── scripts/          # NEW
│   │   ├── script-card.tsx
│   │   └── voiceover-modal.tsx
│   ├── projects/         # NEW
│   │   └── brand-facts-editor.tsx
│   ├── personas/         # NEW (move existing)
│   │   ├── persona-card.tsx
│   │   ├── persona-dialog.tsx
│   │   └── attribute-pill.tsx
│   └── forms/            # NEW
│       └── list-field-editor.tsx
└── app/(dashboard)/projects/new/
    ├── page.tsx          (~400 lines)
    └── steps/            # NEW
        ├── index.ts
        └── step-*.tsx    (9 files)
```

---

## Verification

1. **TypeScript compiles**: `pnpm build` in both apps
2. **No regressions**: Test batch generation, project wizard
3. **Imports updated**: All import paths corrected
4. **NestJS modules updated**: New modules registered in app.module.ts
