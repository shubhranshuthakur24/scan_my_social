# Script Prompt Comparison Audit (Fresh vs Refine)

> Scope: Script generation flow from Script page and Script refine flow.

## Source of Truth

- Fresh script prompt: `App\Services\GeminiService::generateFreshScript()`
- Refine prompt: `App\Services\GeminiService::reviewScript()`
- Script page request origin: `resources/js/Components/ScriptCreateModal.jsx`
- API entrypoint: `App\Http\Controllers\Api\ScriptController::generateFreshScript()`
- Async execution: `App\Jobs\GenerateScriptJob`

---

## Executive Summary

The two prompts are not aligned in structure or quality controls:

1. Fresh prompt is open-ended and creative, but weakly constrained for duration, language consistency, and output reliability.
2. Refine prompt is stricter and better for controlled iteration, but forces inflated scoring (`overallScore >= 9.2`) and has platform wording drift.
3. This mismatch creates uneven UX: fresh scripts vary widely, while refined scripts look more standardized but with unreliable scoring signals.

---

## Side-by-Side Comparison

| Area | Fresh Script Prompt | Refine Prompt |
|---|---|---|
| Goal | Generate new script from topic and constraints | Improve an existing script |
| Input | topic, platform, audience, tone, length, language | original script + optional constraints |
| Output JSON | `title`, `script` | `overallScore`, dimension scores, strengths, improvements, `revisedScript` |
| Constraint strictness | Medium | High |
| Quality rubric | None | Explicit dimension scoring |
| Duration enforcement | Soft wording only | Soft wording only |
| Language enforcement | Soft wording only | Better, but still model-dependent |
| Platform specificity | Mentioned | Mentioned, but body text still says Instagram Reel |
| Safety/guardrails | Minimal | Minimal but more formatting controls |

---

## Key Gaps To Fix

## 1) Fresh prompt is under-constrained

- Current issue: length (`30s/45s/60s`) is requested but not deterministically enforced.
- Impact: large variation in generated script runtime.

## 2) Fresh output contract is too thin

- Current issue: only `title` + `script`; no structure metadata.
- Impact: hard to validate quality and hard to debug weak outputs.

## 3) Refine scoring is artificially forced

- Current issue: `overallScore MUST be 9.2 or higher`.
- Impact: scoring loses meaning and cannot be trusted as a quality metric.

## 4) Refine wording has platform drift

- Current issue: prompt begins with “Instagram Reel script” even when user sets another platform.
- Impact: lower alignment for YouTube/LinkedIn/TikTok-specific outputs.

## 5) Hinglish behavior is ambiguous

- Current issue: no explicit language-mix guideline.
- Impact: outputs swing too English-heavy or Hindi-heavy unpredictably.

---

## Proposed Fix Strategy (Planned)

## Phase 1: Prompt Contract Alignment

1. Create a shared prompt policy block used by both fresh and refine:
   - platform-specific hook style
   - language style rules
   - banned output artifacts
   - strict JSON-only response
2. Remove forced high score floor from refine.
3. Add deterministic duration targets using word budget per length bucket.

## Phase 2: Stronger Output Schemas

1. Fresh output schema should include:
   - `title`
   - `script`
   - `hook`
   - `cta`
   - `estimated_seconds`
   - `language_style_applied`
2. Refine output schema should keep scores but include:
   - `confidence`
   - `constraint_violations` (empty array when clean)

## Phase 3: Runtime Validation + Fail Fast

1. Validate required keys after model response.
2. Validate rough duration against selected length.
3. If invalid:
   - mark generation as failed
   - save parse/validation error for UI visibility
   - do not mark as completed with fallback text.

---

## Immediate Priority Checklist

1. Remove score-floor instruction from refine prompt.
2. Replace “Instagram Reel” phrase with dynamic platform context.
3. Add Hinglish style policy line.
4. Add word-budget rules for `30s/45s/60s`.
5. Add response validation in generation jobs before setting `completed`.

---

## Acceptance Criteria for Upcoming Fix

1. Fresh and refine both produce strict, valid JSON in the expected schema.
2. Length variance stays within acceptable range for selected duration.
3. Refine scores become discriminative (not always high).
4. Platform-specific outputs read correctly for each selected platform.
5. Hinglish output quality is consistent across repeated runs.
6. Invalid model output never gets persisted as successful completion.

---

## Notes

- This document is planning-focused and intentionally does not change runtime behavior yet.
- Implementation should be tracked in a follow-up fix spec once coding starts.
