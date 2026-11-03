# Videos Details Page   Production Bug Audit

Full audit of the video details flow: [VideoController.php](file:///d:/Projects/Viralyzer/app/Http/Controllers/VideoController.php), [PostController.php](file:///d:/Projects/Viralyzer/app/Http/Controllers/Api/PostController.php), [Show.jsx](file:///d:/Projects/Viralyzer/resources/js/Pages/Videos/Show.jsx), and all partials.

---

## 🐛 Bugs Found

### 1. NaN Crash in Engagement Rate (Show.jsx:370)

When `post.likes_count` or `post.comments_count` is `null`, the arithmetic [(null + null) / maxViews](file:///d:/Projects/Viralyzer/resources/js/Pages/Videos/Show.jsx#55-693) produces `NaN`, causing the UI to render `NaN%`.

```js
// BUG: no null coalescing
const engagementRateVal = maxViews > 0 ? ((post.likes_count + post.comments_count) / maxViews) * 100 : 0;
```

**Fix:** Use [(post.likes_count ?? 0)](file:///d:/Projects/Viralyzer/resources/js/Pages/Videos/Show.jsx#55-693) and [(post.comments_count ?? 0)](file:///d:/Projects/Viralyzer/resources/js/Pages/Videos/Show.jsx#55-693).

---

### 2. [addToProject](file:///d:/Projects/Viralyzer/resources/js/Pages/Videos/Show.jsx#466-483) / [createAndAdd](file:///d:/Projects/Viralyzer/resources/js/Pages/Videos/Show.jsx#484-499) Silently Swallows HTTP Errors (Show.jsx:466-498)

These functions use raw [fetch()](file:///d:/Projects/Viralyzer/resources/js/Pages/Videos/Show.jsx#228-232) but never check `response.ok`. A 422/500 response goes through the success path   `setAddedToProject(projectId)` fires, the toast says "Added to project", and the modal closes. The user never sees the error.

**Fix:** Check `if (!response.ok)` after fetch and throw/show error.

---

### 3. `csrfToken` Captured Once at Render, Stale After Session Refresh (Show.jsx:451)

`csrfToken` is read from the meta tag once during render. If the session refreshes (user opens another tab, CSRF rotates), all subsequent [fetch](file:///d:/Projects/Viralyzer/resources/js/Pages/Videos/Show.jsx#228-232) calls in [addToProject](file:///d:/Projects/Viralyzer/resources/js/Pages/Videos/Show.jsx#466-483)/[createAndAdd](file:///d:/Projects/Viralyzer/resources/js/Pages/Videos/Show.jsx#484-499) will 419.

**Fix:** Read `csrfToken` inside each function call, not at component level. Or better: use `axios` consistently (which auto-handles CSRF via the Axios defaults set by Laravel).

---

### 4. Mixed `axios` / raw [fetch](file:///d:/Projects/Viralyzer/resources/js/Pages/Videos/Show.jsx#228-232) Patterns (Show.jsx)

- [handleTranscribe](file:///d:/Projects/Viralyzer/resources/js/Pages/Videos/Show.jsx#376-411), [handleAnalyze](file:///d:/Projects/Viralyzer/resources/js/Pages/Videos/Show.jsx#412-450), [openProjectModal](file:///d:/Projects/Viralyzer/resources/js/Pages/Videos/Show.jsx#453-465) → use `axios`
- [addToProject](file:///d:/Projects/Viralyzer/resources/js/Pages/Videos/Show.jsx#466-483), [createAndAdd](file:///d:/Projects/Viralyzer/resources/js/Pages/Videos/Show.jsx#484-499) → use raw [fetch](file:///d:/Projects/Viralyzer/resources/js/Pages/Videos/Show.jsx#228-232) with manual CSRF

This is inconsistent. `axios` already has CSRF interceptors configured by Laravel. Raw [fetch](file:///d:/Projects/Viralyzer/resources/js/Pages/Videos/Show.jsx#228-232) misses those + has no automatic JSON error parsing.

**Fix:** Convert [addToProject](file:///d:/Projects/Viralyzer/resources/js/Pages/Videos/Show.jsx#466-483) and [createAndAdd](file:///d:/Projects/Viralyzer/resources/js/Pages/Videos/Show.jsx#484-499) to use `axios`.

---

### 5. Potential IDOR on [addToProject](file:///d:/Projects/Viralyzer/resources/js/Pages/Videos/Show.jsx#466-483)   No Backend Ownership Check

The frontend sends `POST /api/projects/{projectId}/posts` with any `projectId`. If the backend doesn't verify the project belongs to the current user, any authenticated user could add posts to other users' projects.

**Action:** Verify `ProjectController::addPost` checks `$project->user_id === auth()->id()`.

---

### 6. [createAndAdd](file:///d:/Projects/Viralyzer/resources/js/Pages/Videos/Show.jsx#484-499) Doesn't Handle Non-JSON Response (Show.jsx:492)

```js
const project = await response.json();
await addToProject(project.id);
```

If the server returns a non-JSON response (e.g., HTML error page), `response.json()` throws, and the error is caught as "Could not create project"   but `project.id` would be `undefined` if the JSON parsing partially succeeds. This is fragile.

**Fix:** Check `response.ok` first, then parse JSON.

---

### 7. Bootstrap Polling Doesn't Guard Against Already-Running Polls (Show.jsx:269-295)

The `useEffect` at line 269 runs bootstrap → calls [fetchTranscriptionStatus()](file:///d:/Projects/Viralyzer/resources/js/Pages/Videos/Show.jsx#156-160) → potentially starts polling. But if `post.id` changes (navigation between videos without unmounting), a new poll starts while the old one might still be running since [startTranscriptionPolling](file:///d:/Projects/Viralyzer/resources/js/Pages/Videos/Show.jsx#161-183) only skips if `transcriptionPollRef.current` is set   and cleanup only sets `cancelled = true`, it doesn't call [stopTranscriptionPolling](file:///d:/Projects/Viralyzer/resources/js/Pages/Videos/Show.jsx#96-102).

**Fix:** Call [stopTranscriptionPolling()](file:///d:/Projects/Viralyzer/resources/js/Pages/Videos/Show.jsx#96-102) in the cleanup return of the useEffect.

---

### 8. `transcriptData` Dependency in Polling Effect Creates Unnecessary Restart (Show.jsx:295)

```js
}, [post.id, transcriptData]);
```

When `transcriptData` changes from null to a value, the effect re-runs, hits the `if (transcriptData)` guard and returns   but this creates unnecessary effect churn. This is minor but could be cleaned up.

---

### 9. `active.plan` Middleware Not Applied to Transcription/Analysis Status Polling (web.php:150,152)

The `transcription-status` and `analysis-status` routes have the `active.plan` middleware, which means if a user's plan expires mid-polling, the polling gets 403ed and the UI shows a generic error instead of a clear "plan expired" message.

**Action:** The frontend should detect 403 + `no_active_plan` from status endpoints too, not just from the trigger endpoints.

---

### 10. [VideoActionWorkflow](file:///d:/Projects/Viralyzer/resources/js/Pages/Videos/Partials/VideoActionWorkflow.jsx#26-81) Button Doesn't Prevent Click When `disabled` (Accessibility)

```jsx
onClick={disabled || loading ? undefined : onClick}
```

Setting `onClick` to `undefined` doesn't prevent keyboard activation. Users can still trigger the button via Enter/Space.

**Fix:** Add a proper `disabled` HTML attribute or `aria-disabled`.

---

### 11. Caption Regex Strips Valid Content (Show.jsx:39)

```js
.replace(/^[\s#\w]*#\w+/g, '')
```

This regex removes leading words followed by a hashtag at the start. A caption like `"My tips #viral"` would lose `"My tips "` too. The intent was to strip leading hashtags, but the `[\s#\w]*` also matches normal words.

**Fix:** `replace(/^(\s*#\w+\s*)+/, '')` to only strip leading hashtag runs.

---

## ⚠️ Warnings (Non-blocking but production-concerning)

### W1. No Loading/Empty State for Project List in Modal

If `projectsList` is empty after loading, the modal shows nothing   no "No projects yet" message.

### W2. `display_url` Image Has No Fallback

If `post.display_url` is null or a dead URL, the image area shows broken image icon in a black box.

### W3. Engagement Rate Precision on Zero Views

When `maxViews === 0`, the engagement rate is `0.0%`. This is technically correct but could be clearer as `N/A`.

### W4. [hasGlobalAnalysis](file:///d:/Projects/Viralyzer/app/Http/Controllers/Api/PostController.php#567-571) Only Checks `hook_score` (PostController.php:569)

```php
return $contentAnalysis->hook_score !== null;
```

If for any reason `hook_score` is null but other analysis fields are populated, the system treats the analysis as non-existent. This is fragile.

---

## Proposed Changes

### Frontend   [Show.jsx](file:///d:/Projects/Viralyzer/resources/js/Pages/Videos/Show.jsx)

1. Fix NaN engagement rate (null coalesce `likes_count`/`comments_count`)
2. Replace [fetch](file:///d:/Projects/Viralyzer/resources/js/Pages/Videos/Show.jsx#228-232) with `axios` in [addToProject](file:///d:/Projects/Viralyzer/resources/js/Pages/Videos/Show.jsx#466-483)/[createAndAdd](file:///d:/Projects/Viralyzer/resources/js/Pages/Videos/Show.jsx#484-499)  
3. Add `response.ok` checks + proper error handling
4. Move `csrfToken` read into function scope (or use axios)
5. Add cleanup [stopTranscriptionPolling()](file:///d:/Projects/Viralyzer/resources/js/Pages/Videos/Show.jsx#96-102)/[stopAnalysisPolling()](file:///d:/Projects/Viralyzer/resources/js/Pages/Videos/Show.jsx#103-109) in bootstrap effects
6. Fix caption regex to only strip leading hashtags

### Frontend   [VideoActionWorkflow.jsx](file:///d:/Projects/Viralyzer/resources/js/Pages/Videos/Partials/VideoActionWorkflow.jsx)

7. Add proper `disabled` attribute to [WorkflowButton](file:///d:/Projects/Viralyzer/resources/js/Pages/Videos/Partials/VideoActionWorkflow.jsx#6-25)

### Frontend   [AddToProjectModal.jsx](file:///d:/Projects/Viralyzer/resources/js/Pages/Videos/Partials/AddToProjectModal.jsx)

8. Add empty state for no projects

---

## Verification Plan

### Manual Verification
1. Navigate to a video detail page with a post that has `null` likes/comments   verify engagement rate shows `0.0%` not `NaN%`
2. Test "Add to Project" flow works end-to-end with axios
3. Verify CSRF token isn't stale by opening the page in two tabs
4. Test refine button works after transcription + analysis complete (the 302 bug we just fixed)
5. Test the disabled workflow buttons can't be triggered via keyboard

---

## Additional Findings (Production Readiness Pass)

### A1. Critical - IDOR on Project APIs Used by Add-to-Project

`ProjectController` actions are using route model binding (`Project $project`) without an ownership check in:
- `show`
- `update`
- `destroy`
- `addPost`
- `removePost`

Files:
- `app/Http/Controllers/Api/ProjectController.php`
- `routes/web.php` (`/api/projects/{project}/*`)

Risk:
- Any authenticated user may read/modify another user's project by ID.

Required fix:
- Enforce `abort_unless($project->user_id === auth()->id(), 403);` (or policy) in every project action.

### A2. High - Add-to-Project Shows Success on Failed HTTP Responses

In `Show.jsx`, `addToProject()` does not check `response.ok`, so 4xx/5xx can still produce "Added to project." UI success.

File:
- `resources/js/Pages/Videos/Show.jsx`

Required fix:
- Validate status before success flow; parse backend error and show toast.

### A3. High - createAndAdd Can Call /projects/undefined/posts

`createAndAdd()` immediately uses `project.id` from response JSON without validating response status/payload shape.
If creation fails, this can call `addToProject(undefined)`.

File:
- `resources/js/Pages/Videos/Show.jsx`

Required fix:
- Check response success first, then assert `project?.id` before calling `addToProject`.

### A4. Medium - Polling Can Overlap Requests

Both polling loops are `setInterval(async ...)` with no in-flight guard. Slow requests can overlap and race state updates.

File:
- `resources/js/Pages/Videos/Show.jsx`

Required fix:
- Add request-in-flight guard (or move to recursive `setTimeout` after each await).

### A5. Medium - Bootstrap Polling Errors Are Silently Swallowed

Bootstrap effects use empty `catch {}` blocks for status fetches, hiding plan/network/API failures.

File:
- `resources/js/Pages/Videos/Show.jsx`

Required fix:
- Surface actionable error state/toast (`no_active_plan`, network, 5xx) instead of silent failure.

### A6. Low - Refine Warning Dialog Copy Is Misleading

Dialog title says "Transcription Required" while refine requires both transcription and analysis.

File:
- `resources/js/Pages/Videos/Show.jsx`

Required fix:
- Update copy to "Transcription and Analysis Required".
