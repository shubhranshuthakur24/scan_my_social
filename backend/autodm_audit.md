# AutoDM Module Audit
Date: 2026-03-19

## Executive Summary
- Core flow is solid and feature‑rich (comment triggers, public replies, ask‑to‑follow, image replies, deeplinks), but there are several correctness and reliability risks under concurrency.
- There is a **flow-scope mismatch** between runtime idempotency and the DB uniqueness constraint on `automation_logs.trigger_source_id`, which can block legitimate executions.
- Pending CTA/follow gating uses cache keys that are **not flow‑scoped**, so concurrent flows can overwrite each other’s pending state and mis-route replies.
- The AutoDM dashboard and create flow are heavy on DB queries and payload size; performance will degrade as flow count grows.
- Configuration of Instagram OAuth is currently **hardcoded**, which is fragile across environments.

## Findings by Severity

### P0   Critical
- **No P0 issues identified** in current code.

### P1   High
1. **Idempotency/DB constraint mismatch**
   - **Where:** `automation_logs` migration enforces `trigger_source_id` **globally unique**, while `ExecuteAutomationActionJob` now dedupes by `(automation_flow_id, trigger_source_id)`.
   - **Impact:** If the same `trigger_source_id` appears across flows/accounts, DB insert will fail even though the code allows it. This can silently block valid sends or cause retry loops.
   - **Fix:** Change DB constraint to composite unique `(automation_flow_id, trigger_source_id)` and update any code that assumes global uniqueness. Consider also adding a unique index on `(instagram_account_id, trigger_source_id)` if you want cross-flow dedupe per account.
   - **Files:** `database/migrations/2026_03_11_210350_create_automation_logs_table.php`, `app/Jobs/ExecuteAutomationActionJob.php`.

2. **Pending CTA/follow cache keys are not flow‑scoped**
   - **Where:** `ExecuteAutomationActionJob` stores pending CTA/follow state under keys like `autodm:pending_follow:{account_id}:{user_id}` and `autodm:pending_button:{account_id}:{user_id}`.
   - **Impact:** If a user triggers multiple flows (or triggers another flow before responding), the pending state can be overwritten. This can route the reply to the wrong flow or drop a valid CTA/follow confirmation.
   - **Fix:** Include `flow_id` in the cache key or store a map keyed by flow_id in a single cache entry. Also include `trigger_source_id` if you want per‑trigger isolation.
   - **Files:** `app/Jobs/ExecuteAutomationActionJob.php`, `app/Jobs/ProcessMetaWebhookJob.php`.

3. **OAuth connect URL is hardcoded**
   - **Where:** `AutoDmController::connect()` uses a fixed `client_id` and `redirect_uri`, ignoring `config/services.php`.
   - **Impact:** Environment changes (staging/prod, new app ID, redirect URI change) require code changes and redeploys; risk of mismatched callback URL and login failures.
   - **Fix:** Build the URL using `config('services.facebook.client_id')` and `config('services.facebook.redirect')`, with a fallback to env. Keep the URL centralized.
   - **Files:** `app/Http/Controllers/AutoDmController.php`, `config/services.php`, `.env*`.

### P2   Medium
1. **Dashboard N+1 query pattern**
   - **Where:** `AutoDmController::index()` fetches recent logs per flow with a query inside a loop.
   - **Impact:** Slow dashboard load as flow count grows.
   - **Fix:** Batch load logs with a single query keyed by flow ids; build a per‑flow map in memory.
   - **Files:** `app/Http/Controllers/AutoDmController.php`.

2. **Large payloads without pagination**
   - **Where:** `AutoDmController::index()` loads all flows, all active message variants, and counts in one response.
   - **Impact:** Large Inertia payloads and longer page load time for users with many flows.
   - **Fix:** Paginate flows; lazy‑load per‑flow details in the drawer view.
   - **Files:** `app/Http/Controllers/AutoDmController.php`, `resources/js/Pages/AutoDM/Index.jsx`.

3. **Single key for webhook dedupe**
   - **Where:** `ProcessMetaWebhookJob` uses `Cache::add("ig_event_$triggerId")` without account scoping.
   - **Impact:** If `triggerId` collisions are possible across accounts, dedupe could drop valid events.
   - **Fix:** Use `ig_event_{account_id}_{triggerId}`.
   - **Files:** `app/Jobs/ProcessMetaWebhookJob.php`.

4. **Create.jsx is very large and state‑heavy**
   - **Where:** `resources/js/Pages/AutoDM/Create.jsx`.
   - **Impact:** Harder to maintain, harder to test, and risk of UI regressions.
   - **Fix:** Split into smaller components and move pure helpers to `createUtils`.

5. **Deeplink signatures never expire**
   - **Where:** `AutodmDeeplinkService::build()` uses signed route without TTL.
   - **Impact:** If a deeplink is leaked, it remains valid forever.
   - **Fix:** Consider adding an expiration window (e.g., 7–30 days) or store `created_at` and enforce max age.
   - **Files:** `app/Services/AutodmDeeplinkService.php`, `app/Http/Controllers/AutodmDeeplinkController.php`.

6. **Storage URL assumptions**
   - **Where:** `MediaUrlService` and `ExecuteAutomationActionJob` rely on `deliveryUrl()` for media URL. If storage URLs expire too soon or are not public, Meta may fail to fetch images.
   - **Fix:** Ensure TTL is long enough for Meta fetches, and consider logging the actual URL expiry when failures occur.
   - **Files:** `app/Services/MediaUrlService.php`, `app/Jobs/ExecuteAutomationActionJob.php`.

## Quick Wins
- Scope webhook dedupe keys by account id.
- Align DB uniqueness with runtime idempotency (composite unique index).
- Move OAuth URL construction to `config/services.php` and remove hardcoded values.
- Batch recent logs in `AutoDmController::index()` to remove N+1 queries.

## Medium‑Term Refactors
- Paginate flow list and lazy‑load the flow detail drawer payload.
- Split `Create.jsx` into feature subcomponents (Keywords, Variants, Ask‑to‑Follow, Public Replies).
- Add a small service layer for reusable flow validation (some logic still duplicated between store/update).

## Test Gaps + Suggested Tests
- **Webhook dedupe:** simulate duplicate webhook payloads and assert only one job proceeds.
- **Pending CTA/follow:** two flows triggered by same user in short time; ensure confirmations route correctly.
- **Idempotency constraint:** ensure multiple flows can process same trigger id (if you adopt composite unique).
- **OAuth callback:** failure handling for missing accounts, invalid code, and webhook subscription failure.
- **Image replies:** verify JPEG only, and unsupported format fallback.

## Files Reviewed (key)
- Backend: `AutoDmController`, `ProcessMetaWebhookJob`, `ExecuteAutomationActionJob`, `MetaApiService`, `AutodmDeeplinkService`, models.
- Frontend: `AutoDM/Create.jsx`, `AutoDM/Index.jsx`, `AutoDM/Partials/*`.
- Config/routes: `routes/web.php`, `config/services.php`, `DomainRouteGuard`.
