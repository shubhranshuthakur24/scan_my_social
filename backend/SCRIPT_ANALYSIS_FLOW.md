# Script Analysis Flow (Run Deep Analysis)

This document explains the current deep analysis lifecycle for a video post, from user click to final stored analysis.

## Scope
- Feature: `Run Deep Analysis` on video details page
- Frontend entry: `resources/js/Pages/Videos/Show.jsx`
- API endpoints:
  - `POST /api/posts/{post}/analyze`
  - `GET /api/posts/{post}/analysis-status`
- Controller: `app/Http/Controllers/Api/PostController.php`
- Queue job: `app/Jobs/AnalyzePostJob.php`
- AI service: `app/Services/ContentProcessingService.php` -> `app/Services/GeminiService.php`

## High-Level Behavior
- Analysis is resumable and background-queued.
- User can leave/refresh and resume via status polling.
- Analysis result is global per post (`content_analyses`).
- Billing/unlock state is per user (`content_analysis_by_user`).

## End-to-End Step-by-Step

### 1) User clicks Run Deep Analysis
1. User opens video details page and clicks `Run Deep Analysis`.
2. Frontend calls:
   - `POST /api/posts/{post}/analyze`
3. Source: `handleAnalyze` in `resources/js/Pages/Videos/Show.jsx`.

### 2) Controller pre-checks and fast paths
1. `PostController::analyze(Post $post)` verifies transcription exists:
   - Requires `post.is_transcribed = true`
   - Requires `post.contentAnalysis.transcription` to be non-empty
   - Else returns `422`.
2. Controller gets/creates global `content_analyses` row with default `analysis_status = idle`.
3. Controller checks:
   - Global analysis already exists? (`hook_score != null`)
   - User already unlocked? (`analysis_charged_at` in pivot)
4. Fast path responses:
   - If global exists + user unlocked: return `200` + analysis.
   - If global exists + user not unlocked: mark user completed/charged idempotently and return `200` + analysis.

### 3) Queue path when analysis is not yet available
1. If user already has pivot `analysis_status` in `queued/processing`, return `202` with current status.
2. Else:
   - Set per-user pivot `analysis_status = queued`.
   - Set global `content_analyses.analysis_status = queued` (if not already processing).
   - Dispatch `AnalyzePostJob` on queue `analysis`.
   - Return `202` `{ status: queued }`.

### 4) Frontend behavior after POST
1. If response is `200`: UI marks analysis available immediately.
2. If response is `202`: UI switches to processing mode and starts polling every ~2s:
   - `GET /api/posts/{post}/analysis-status`
3. If user leaves or refreshes:
   - On mount, page calls status endpoint once.
   - If status is `queued` or `processing`, polling resumes automatically.

### 5) AnalyzePostJob execution
1. Worker picks `AnalyzePostJob` from `analysis` queue.
2. Job loads post + contentAnalysis.
3. Job acquires per-post single-flight lock:
   - Key: `analysis_lock:post:{postId}`
   - TTL: 300s
4. If lock not acquired:
   - If global analysis already exists: mark user/global completed and return.
   - Else keep user queued and release job for retry after 5 seconds.

### 6) Under lock: processing and persistence
1. Validate transcription again (defensive check).
2. Mark statuses:
   - Global `analysis_status = processing`
   - User pivot `analysis_status = processing`
3. If global analysis missing:
   - Call `ContentProcessingService::analyze($post, $userId)`
   - Service calls Gemini strategic analysis prompt
   - Persists strategy fields on `content_analyses` (hook, content_angle, scores, etc.)
4. On success:
   - Set `posts.is_analyzed = true`
   - Set user pivot `analysis_status = completed`
   - Set user `analysis_charged_at` (idempotent)
   - Set global `analysis_status = completed`

### 7) Failure path
1. On exception in job:
   - User pivot: `analysis_status = failed`, `analysis_error = exception message`
   - Global: set `analysis_status = failed` only if no global analysis exists yet
2. Error is logged in app logs.

### 8) Status endpoint behavior
`PostController::analysisStatus(Post $post)` returns:
- `status` (per-user): `idle|queued|processing|completed|failed`
- `global_status` (global): `idle|queued|processing|completed|failed`
- `error` when per-user status is failed
- `analysis` payload when per-user status is completed

## Data Model and Status Fields

### Global (`content_analyses`)
- `analysis_status`: `idle|queued|processing|completed|failed`
- Analysis content fields:
  - `hook`, `content_angle`, `psychological_driver`, `structure_model`, `mechanism_type`, `insight_shift`, `rhythm_profile`, `cta_type`, `closure_type`, `archetype`
  - score fields like `hook_score`, `content_angle_score`, etc.

### Per-user (`content_analysis_by_user`)
- `analysis_status`: `idle|queued|processing|completed|failed`
- `analysis_error`: nullable text
- `analysis_charged_at`: nullable timestamp (set once when unlocked)

## Prompt Used for Deep Analysis

Current prompt source:
- `GeminiService::analyzeStrategy(string $transcript)` in `app/Services/GeminiService.php`

Prompt template:

```text
Analyze the following transcript to extract its strategic DNA and evaluate the strength of each section. 

Transcript:
{$transcript}

Return ONLY this JSON structure with detailed strategic insights and a strength score (integer from 1-10) for each:
{
    "title": "A short, catchy title representing the analyzed video strategy (max 60 chars)",
    "hook": "Detailed analysis of the opening hook strategy used",
    "hook_score": 1-10,
    "content_angle": "The unique perspective or conceptual frame of the video",
    "content_angle_score": 1-10,
    "psychological_driver": "The core human desire or bias triggered (e.g., status seeking, loss aversion, curiosity gap)",
    "psychological_driver_score": 1-10,
    "structure_model": "The rhythmic or logical model used (e.g., Problem-Agitate-Solution, Listicle, Reveal)",
    "structure_model_score": 1-10,
    "mechanism_type": "The way the value is delivered (e.g., Screencast, Talking Head, B-roll with VO)",
    "mechanism_type_score": 1-10,
    "insight_shift": "The specific 'aha' moment or shift in viewer perspective provided",
    "insight_shift_score": 1-10,
    "rhythm_profile": "Description of the pacing, beat structure, and flow transitions",
    "rhythm_profile_score": 1-10,
    "cta_type": "The strategic approach to the closing (e.g., Direct, Curiosity-based, Subtle)",
    "cta_type_score": 1-10,
    "closure_type": "How the video ends to maximize memorability or loops",
    "closure_type_score": 1-10,
    "archetype": "The creator persona being used (e.g., The Expert, The Rebel, The Curated Researcher, The Everyday Hero)",
    "archetype_score": 1-10
}
```

## Model and Response Mode
- Service: `GeminiService::generateContent()`
- Model config key: `services.gemini.model` (default `gemini-2.5-flash`)
- JSON mode enabled for analysis via:
  - `generationConfig.response_mime_type = application/json`

## Queue Requirement
For low latency and resumable UX, an analysis worker must run for queue `analysis`.

Recommended worker command pattern:

```bash
php artisan queue:work --queue=analysis --sleep=1 --tries=3 --timeout=240 --max-time=55
```

(Use `flock` and cron/supervisor based on your hosting setup.)

## Quick Troubleshooting
- `status` stuck at `queued`:
  - analysis worker not running or wrong queue name.
- `failed` with no visible UI detail:
  - check `analysis_error` in `content_analysis_by_user` and app logs.
- Repeat AI calls for same post:
  - verify global analysis fields (e.g., `hook_score`) are persisted.
