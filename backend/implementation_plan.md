# MVP Production Laravel Implementation Plan: Scan My Social AutoDM

This plan outlines the streamlined, MVP technical architecture to implement the AutoDM feature safely and effectively. It relies on a simplified schema focused strictly on core conversions without over-engineering.

## Core Architecture Overview

1.  **Meta Graph API:** For receiving webhooks (comments, story replies) and sending DMs.
2.  **Laravel Webhooks:** Fast controllers to accept and immediately queue incoming Meta events (to ensure 200 OK under 3 seconds).
3.  **Laravel Horizon (Redis):** For managing job queues, rate limiting, and ensuring messages are sent reliably with random delays.
4.  **Database (PostgreSQL/MySQL):** To store simplified automation flows, connected accounts, and delivery logs to prevent duplicate sends.

## 1. Database Schema Additions (MVP)

The MVP schema is deliberately simplified. One flow = one trigger keyword = one action message.

### [NEW] `create_instagram_accounts_table.php`
*   Stores the OAuth connection details for a user's Instagram account.
*   **Columns:** `id`, `user_id`, `ig_account_id`, `fb_page_id`, `access_token`, `token_expires_at`, `status`, `timestamps`.

### [NEW] `create_automation_flows_table.php`
*   A flat, unified table driving content-level automation. It defines which specific media item and keyword trigger which reply.
*   **Columns:** `id`, `user_id`, `instagram_account_id`, `trigger_type` (enum: post, reel, story), `trigger_value` (string: media_id or story_id), `keywords` (json array of strings), `reply_message` (text), `status` (active, paused), `timestamps`.

### [NEW] `create_automation_logs_table.php`
*   Tracks every action taken and acts as the **primary duplicate protection layer**.
*   **Columns:** `id`, `automation_flow_id`, `trigger_source_id` (the IG comment/message ID), `recipient_ig_id`, `status` (queued, sent, failed), `error_code`, `error_message`, `response_payload` (json), `timestamps`.
*   **Crucial Index:** `UNIQUE(trigger_source_id)` must be enforced at the database level to fundamentally prevent sending a DM twice for the same comment.

## 2. Core Backend Components

### [NEW] Routing & Webhooks
*   **[routes/api.php](file:///d:/Projects/Viralyzer/routes/api.php):** Add endpoints for Meta webhook verification (GET) and receiving payloads (POST).
    *   `GET /api/webhooks/meta` (Verification)
    *   `POST /api/webhooks/meta` (Event payload)

### [NEW] Webhook Controller
*   **`app/Http/Controllers/Api/MetaWebhookController.php`**
    *   Must respond with `200 OK` immediately.
    *   Verifies signature using `X-Hub-Signature-256`.
    *   Dispatches `ProcessMetaWebhookJob`.

### [NEW] Job Queueing & Execution Logic

*   **`app/Jobs/ProcessMetaWebhookJob.php`**
    *   **1. Detect Event & Extract Context:** Parse the payload.
        *   **Standard Comments Check:** `if ($field === 'comments' && $value['verb'] === 'add')`. Extract `media_id`, `commentText`, and `$commentUserId`.
        *   **Story Reply Check:** `if (isset($value['messaging']))`. Extract `$storyId = $message['reply_to']['story']['id'] ?? $fallbackId`. Extract sender `$commentUserId`.
    *   **2. Self-Loop Protection:** `if($commentUserId == $accountId) return;` - **CRITICAL:** Drop actions triggered by the connected account themselves to prevent infinite DM loops.
    *   **3. Match Content ID First:** Query `AutomationFlow::where('instagram_account_id', $accountId)->where('trigger_value', $mediaId)->where('status', 'active')->get()`. *(Note: $accountId is explicitly required here to prevent cross-user leakage).*
    *   **4. Keyword Matching:** Loop through the matching flows' JSON `keywords` array and use explicit word boundaries: `preg_match('/\b'.preg_quote($keyword,'/').'\b/i', $commentText)`.
    *   **5. Dispatch & Stop:** If a match is found, dispatch `ExecuteAutomationActionJob` and immediately `return;` to prevent a single comment from triggering multiple different flows.

*   **`app/Jobs/ExecuteAutomationActionJob.php`**
    *   **Retry Logic:** Employs progressive backoff for Meta API failures:
        *   `public $tries = 3;`
        *   `public $backoff = [30, 60, 120];`
    *   **Per-Minute Throttle:** Wrap the execution in `RateLimiter::attempt("dm:$accountId", 3, function() { ... })` to prevent ban-inducing spike volume. Let the job be re-queued or delayed.
    *   **Recent DM Check (Optional/Smart):** Query `AutomationLog::where('recipient_ig_id', $userId)->whereDate('created_at', today())->exists()` to optionally skip users we've already DMed today.
    *   **Randomized Human Delay:** Enforce `sleep(rand(15, 45));` before hitting the Meta API to emulate human typing/action delays.
    *   Uses Redis lock/check on `trigger_source_id` as a fast first-layer duplicate check before falling back to the DB's unique constraint.
    *   Hits Meta API via `MetaApiService` to send the `reply_message`.
    *   Records success/failure in `automation_logs`, including storing `error_code` and `response_payload` on failure.

### [NEW] Meta API Service
*   **`app/Services/MetaApiService.php`**
    *   Wrapper around Laravel HTTP client to interact with the Graph API (`sendMessage()`, `replyToComment()`, `getProfile()`).

## 3. Frontend Implementation (Inertia/React & Tailwind)

### [NEW] AutoDM Dashboard & Flow Builder
*   **`resources/js/Pages/AutoDM/Index.jsx`**
    *   List of connected accounts.
    *   List of active flat flows. Button to "Create Flow".

### [NEW] Create Flow Modal/Page
*   **`resources/js/Pages/AutoDM/Create.jsx`** (or `Edit.jsx`)
    *   Simple 3-step form to ensure content-level accuracy: 
        1. **Select Content:** Hit Meta API `/me/media` to let the user visually select a specific Reel, Post, or Story. (Extracts and saves the `media_id` to the flow).
        2. **Configure Triggers:** Input Trigger Keyword(s) (e.g., "price", "cost").
        3. **Configure Action:** Input the exact DM Reply Message.
    *   Save directly to `automation_flows` table, ensuring `trigger_type` and `trigger_value` are populated.

## Verification Plan

### Automated Tests
1.  **Case-Insensitive Matching:** Test that comment "GROWTH", "Growth", and "growth" all correctly trigger the flow for keyword "growth".
2.  **Self-Loop Prevention:** Mock a webhook where the sender ID matches the connected IG account ID and assert the job silently returns without dispatching the execution job.
3.  **Unique Constraint:** Attempt to write two `automation_logs` with the same `trigger_source_id` and ensure a database exception is caught and handled safely.

### Manual Verification
1.  Connect a test Instagram account.
2.  Set up a flow: Keyword = "price", Message = "It's $99".
3.  Comment "What is the Price?" from a secondary account.
4.  Verify a background delay of 15-45 seconds occurs.
5.  Verify the DM is received successfully.
6.  Comment again from the connected account itself and verify NO DM is sent.
