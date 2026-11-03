# AutoDM Module   Production Readiness Audit

> **Scope:** [AutoDmController](file:///d:/Projects/Viralyzer/app/Http/Controllers/AutoDmController.php#22-991), [MetaWebhookController](file:///d:/Projects/Viralyzer/app/Http/Controllers/Api/MetaWebhookController.php#10-126), [ProcessMetaWebhookJob](file:///d:/Projects/Viralyzer/app/Jobs/ProcessMetaWebhookJob.php#17-850), [ExecuteAutomationActionJob](file:///d:/Projects/Viralyzer/app/Jobs/ExecuteAutomationActionJob.php#21-923), [MetaApiService](file:///d:/Projects/Viralyzer/app/Services/MetaApiService.php#11-836), models ([InstagramAccount](file:///d:/Projects/Viralyzer/app/Models/InstagramAccount.php#8-42), [AutomationFlow](file:///d:/Projects/Viralyzer/app/Models/AutomationFlow.php#8-70), [AutomationFlowMessage](file:///d:/Projects/Viralyzer/app/Models/AutomationFlowMessage.php#8-34), [AutomationLog](file:///d:/Projects/Viralyzer/app/Models/AutomationLog.php#8-31)), [AutoDmRequest](file:///d:/Projects/Viralyzer/app/Http/Requests/AutoDmRequest.php#7-87), and AutoDM routes.

---

## Audit Summary

| Severity | Count |
|----------|-------|
| 🔴 Critical | 2 |
| 🟠 High | 4 |
| 🟡 Medium | 4 |
| 🟢 Low | 3 |

---

## 🔴 Critical Issues

### 1. `access_token` Leaked to Frontend via Inertia

**Files:** [InstagramAccount.php:12-25](file:///d:/Projects/Viralyzer/app/Models/InstagramAccount.php#L12-L25), [AutoDmController.php:36-39](file:///d:/Projects/Viralyzer/app/Http/Controllers/AutoDmController.php#L36-L39)

The [InstagramAccount](file:///d:/Projects/Viralyzer/app/Models/InstagramAccount.php#8-42) model has `access_token` in `$fillable` and **no** `$hidden` array. The controller passes the full account object to Inertia:

```php
// AutoDmController::index, create, edit
return Inertia::render('AutoDM/Index', [
    'account' => $account, // access_token included in JSON!
]);
```

The long-lived Instagram token (60-day validity) is sent to the browser in every AutoDM page response. Any XSS or browser extension can steal it and send DMs on behalf of the user.

> [!CAUTION]
> This is a **token exfiltration** risk. The access token gives full messaging API access to the Instagram account.

**Fix:** Add `$hidden` to [InstagramAccount](file:///d:/Projects/Viralyzer/app/Models/InstagramAccount.php#8-42):
```php
protected $hidden = [
    'access_token',
    'fb_page_id',
    'webhook_subscriptions_error',
];
```

---

### 2. OAuth Callback Logs Authorization Code in Full URL

**File:** [AutoDmController.php:627-631](file:///d:/Projects/Viralyzer/app/Http/Controllers/AutoDmController.php#L627-L631)

```php
Log::info('AutoDM OAuth callback received', [
    'has_code' => (bool) $code,
    'query' => $request->query(),     // ← contains ?code=SECRET
    'full_url' => $request->fullUrl(), // ← also contains ?code=SECRET
]);
```

The one-time authorization code is logged in **two** ways. While short-lived, log aggregation tools expose it to anyone with log access.

**Fix:** Remove `query` and `full_url` from the log context:
```php
Log::info('AutoDM OAuth callback received', [
    'has_code' => (bool) $code,
]);
```

---

## 🟠 High Severity Issues

### 3. No Retry Limits on ProcessMetaWebhookJob

**File:** [ProcessMetaWebhookJob.php:17-19](file:///d:/Projects/Viralyzer/app/Jobs/ProcessMetaWebhookJob.php#L17-L19)

The job has no `$tries`, `$timeout`, or `$backoff`. If any exception is thrown (e.g., Meta API outage), it retries infinitely. [ExecuteAutomationActionJob](file:///d:/Projects/Viralyzer/app/Jobs/ExecuteAutomationActionJob.php#21-923) has `$tries = 3` but [ProcessMetaWebhookJob](file:///d:/Projects/Viralyzer/app/Jobs/ProcessMetaWebhookJob.php#17-850) doesn't.

**Fix:**
```php
public $tries = 3;
public $backoff = [10, 30, 60];
public $timeout = 60;
```

---

### 4. No `active.plan` Middleware or Flow Limit on AutoDM Routes

**File:** [web.php:97-107](file:///d:/Projects/Viralyzer/routes/web.php#L97-L107)

```php
Route::prefix('autodm')->middleware(['auth', 'verified'])->group(function () {
    Route::post('/flows', ...)->name('autodm.flows.store');
    // No active.plan, no throttle, no flow limit
});
```

A user with an expired/cancelled plan can still create unlimited flows. There's also no cap on flow count, so a user could create hundreds of flows and consume webhook processing resources.

**Fix:**
- Add `active.plan` middleware to [store](file:///d:/Projects/Viralyzer/app/Http/Controllers/Auth/RegisteredUserController.php#26-61), [update](file:///d:/Projects/Viralyzer/app/Http/Controllers/Auth/PasswordController.php#13-29), [duplicate](file:///d:/Projects/Viralyzer/app/Http/Controllers/AutoDmController.php#529-592), and [toggleStatus](file:///d:/Projects/Viralyzer/app/Http/Controllers/AutoDmController.php#515-528)
- Add a max flow limit check in [store()](file:///d:/Projects/Viralyzer/app/Http/Controllers/Auth/RegisteredUserController.php#26-61):
```php
$flowCount = AutomationFlow::where('user_id', auth()->id())->count();
$limit = PlanService::featureLimit('autodm_flows');
if ($flowCount >= $limit) {
    return back()->withErrors(['limit' => "Flow limit reached ({$limit})."]);
}
```

---

### 5. `user_id` and `instagram_account_id` Mass-Assignable on AutomationFlow

**File:** [AutomationFlow.php:12-13](file:///d:/Projects/Viralyzer/app/Models/AutomationFlow.php#L12-L13)

```php
protected $fillable = [
    'user_id',              // ← attacker-settable
    'instagram_account_id', // ← attacker-settable
    ...
```

The controller uses `AutomationFlow::create()` with explicit values, so this isn't currently exploitable. But if any future code passes `$request->all()`, an attacker could hijack another user's Instagram account.

**Fix:** Remove both from `$fillable`. The controller already sets them explicitly.

---

### 6. [sendPublicCommentReply](file:///d:/Projects/Viralyzer/app/Services/MetaApiService.php#383-412) Passes Token in Form Body, Not Bearer Header

**File:** [MetaApiService.php:386-396](file:///d:/Projects/Viralyzer/app/Services/MetaApiService.php#L386-L396)

```php
public function sendPublicCommentReply(...): array
{
    $payload = [
        'message' => $messageText,
        'access_token' => $accessToken, // ← in form body!
    ];

    $response = $this->httpClient()
        ->asForm()
        ->post(..., $payload);
```

Every other method uses `->withToken($accessToken)` (Bearer header). This one puts the token in the POST body, which can be logged by proxies, WAFs, or Meta's access logs.

**Fix:** Use bearer header like all other methods:
```php
$response = $this->httpClient()
    ->withToken($accessToken)
    ->asForm()
    ->post($this->graphUrl . $commentId . '/replies', [
        'message' => $messageText,
    ]);
```

---

## 🟡 Medium Severity Issues

### 7. No Delete Route for Flows

**File:** [web.php:97-107](file:///d:/Projects/Viralyzer/routes/web.php#L97-L107)

Users can create, edit, duplicate, and toggle flows, but cannot delete them. This forces users to accumulate flows with no way to clean up, and all flows' logs are loaded on the index page.

**Fix:** Add a `DELETE /autodm/flows/{flow}` route and controller method with ownership check.

---

### 8. Index Page Loads ALL Logs Without Pagination

**File:** [AutoDmController.php:78-85](file:///d:/Projects/Viralyzer/app/Http/Controllers/AutoDmController.php#L78-L85)

```php
$recentLogs = AutomationLog::query()
    ->whereIn('automation_flow_id', $flowIds)
    ->orderByDesc('id')
    ->get([...]); // ← loads ALL logs into memory
```

For active automations with thousands of logs, this could OOM the server. The result is truncated to 5 per flow via `->take(5)`, but the full result set is loaded first.

**Fix:** Use `limit()` in the query or fetch per-flow with individual queries:
```php
// Use a subquery to only load the top 5 per flow
$recentLogs = AutomationLog::query()
    ->whereIn('automation_flow_id', $flowIds)
    ->orderByDesc('id')
    ->limit($flowIds->count() * 5)
    ->get([...]);
```

---

### 9. No Token Refresh/Expiry Handling

**File:** [InstagramAccount.php:28](file:///d:/Projects/Viralyzer/app/Models/InstagramAccount.php#L28)

`token_expires_at` is stored but never checked. If the 60-day token expires, the first DM attempt fails silently. The user gets [failed](file:///d:/Projects/Viralyzer/app/Jobs/GenerateScriptJob.php#95-117) logs but no proactive notification.

**Fix (Phase 2):** Add a scheduled command that checks `token_expires_at < now()->addDays(7)` and notifies users to re-authenticate. Alternatively, add a token refresh endpoint using Meta's long-lived token refresh API.

---

### 10. Duplicate Dedup Windows Are Inconsistent

**Files:** [ProcessMetaWebhookJob.php:181](file:///d:/Projects/Viralyzer/app/Jobs/ProcessMetaWebhookJob.php#L181), [ExecuteAutomationActionJob.php:104-115](file:///d:/Projects/Viralyzer/app/Jobs/ExecuteAutomationActionJob.php#L104-L115)

| Layer | Mechanism | Window |
|-------|-----------|--------|
| [ProcessMetaWebhookJob](file:///d:/Projects/Viralyzer/app/Jobs/ProcessMetaWebhookJob.php#17-850) | `Cache::add` | 1 minute |
| [ExecuteAutomationActionJob](file:///d:/Projects/Viralyzer/app/Jobs/ExecuteAutomationActionJob.php#21-923) | DB [AutomationLog](file:///d:/Projects/Viralyzer/app/Models/AutomationLog.php#8-31) check | Forever |
| [ExecuteAutomationActionJob](file:///d:/Projects/Viralyzer/app/Jobs/ExecuteAutomationActionJob.php#21-923) | Daily recipient limit | 24 hours |

The 1-minute cache dedup is very short. Meta can deliver the same webhook event up to **5 minutes apart** during retry storms. If the cache TTL expires and the DB check in [ExecuteAutomationActionJob](file:///d:/Projects/Viralyzer/app/Jobs/ExecuteAutomationActionJob.php#21-923) catches it, a duplicate [ProcessMetaWebhookJob](file:///d:/Projects/Viralyzer/app/Jobs/ProcessMetaWebhookJob.php#17-850) still runs all the keyword matching logic before being stopped.

**Fix:** Increase cache dedup window to 5 minutes:
```php
if (!Cache::add("ig_event_{$this->accountId}_{$triggerId}", true, now()->addMinutes(5))) {
```

---

## 🟢 Low Severity Issues

### 11. Excessive `Log::info` on Hot Webhook Path

**Files:** [ProcessMetaWebhookJob.php](file:///d:/Projects/Viralyzer/app/Jobs/ProcessMetaWebhookJob.php) (~30 `Log::info` calls), [MetaApiService.php](file:///d:/Projects/Viralyzer/app/Services/MetaApiService.php) (~15 `Log::info` calls)

Viral content can trigger thousands of webhooks per hour. Every webhook generates 5-10 `Log::info` entries across the happy path. This creates log noise and disk pressure.

**Fix:** Downgrade happy-path logs to `Log::debug`. Keep `Log::info` only for terminal events (sent, failed, matched).

---

### 12. No `$hidden` on [AutomationLog](file:///d:/Projects/Viralyzer/app/Models/AutomationLog.php#8-31) Model

**File:** [AutomationLog.php:12-20](file:///d:/Projects/Viralyzer/app/Models/AutomationLog.php#L12-L20)

`response_payload` can contain raw Meta API responses including internal error details. These are sent to the frontend via `recent_logs` in the index page.

**Fix:** Add `$hidden`:
```php
protected $hidden = ['response_payload'];
```

---

### 13. No Rate Limit on [fetchMedia](file:///d:/Projects/Viralyzer/app/Http/Controllers/AutoDmController.php#743-786) Endpoint

**File:** [web.php:107](file:///d:/Projects/Viralyzer/routes/web.php#L107)

```php
Route::get('/fetch-media/{instagramAccount}', [AutoDmController::class, 'fetchMedia']);
```

This proxies to the Meta API. Without throttling, a client could spam this and exhaust the Instagram API rate limit.

**Fix:** Add `throttle:30,1` middleware.

---

## ✅ What's Done Right

| Area | Status |
|------|--------|
| Webhook HMAC signature verification | ✅ `hash_equals` + SHA-256 |
| Self-trigger prevention | ✅ `userId === accountId` guard |
| Duplicate protection (Cache + DB) | ✅ Two-layer dedup |
| Rate limiting on send loop | ✅ `RateLimiter::attempt` per account |
| Daily recipient limit | ✅ One sequence per recipient per day |
| Ownership checks on all CRUD | ✅ `user_id !== auth()->id()` |
| Duplicate content guard | ✅ [hasDuplicateTriggerContent](file:///d:/Projects/Viralyzer/app/Http/Controllers/AutoDmController.php#932-954) |
| Retry + backoff on ExecuteAutomationActionJob | ✅ `$tries=3`, `$backoff` |
| Form request validation | ✅ [AutoDmRequest](file:///d:/Projects/Viralyzer/app/Http/Requests/AutoDmRequest.php#7-87) with typed rules |
| Transaction wrapping on store/update | ✅ `DB::transaction` |
| Duplicate starts paused | ✅ Prevents accidental double replies |

---

## Priority Action List

| # | Fix | Effort | Impact |
|---|-----|--------|--------|
| 1 | Add `$hidden` to [InstagramAccount](file:///d:/Projects/Viralyzer/app/Models/InstagramAccount.php#8-42) (access_token, fb_page_id) | 2 min | 🔴 Token exposure |
| 2 | Remove auth code from OAuth callback log | 1 min | 🔴 Secret leakage |
| 3 | Add `$tries=3`, `$backoff`, `$timeout` to ProcessMetaWebhookJob | 2 min | 🟠 Queue stability |
| 4 | Add `active.plan` to store/update/duplicate/toggle + flow limit | 10 min | 🟠 Billing enforcement |
| 5 | Remove `user_id`/`instagram_account_id` from AutomationFlow `$fillable` | 2 min | 🟠 Defense in depth |
| 6 | Fix [sendPublicCommentReply](file:///d:/Projects/Viralyzer/app/Services/MetaApiService.php#383-412) to use bearer header | 2 min | 🟠 Token hygiene |
| 7 | Add DELETE route for flows | 15 min | 🟡 UX |
| 8 | Limit automation logs loaded on index page | 5 min | 🟡 Performance |
| 10 | Increase webhook dedup window to 5 min | 1 min | 🟡 Dedup robustness |
| 12 | Add `$hidden` to AutomationLog | 1 min | 🟢 Data leakage |
| 13 | Throttle fetchMedia route | 1 min | 🟢 API abuse |
